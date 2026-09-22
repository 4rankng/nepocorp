#!/usr/bin/env python3
"""Populate an isolated local NEPO database with realistic synthetic operations.

Run after the normal application seed, with the API on localhost:3090 and the
tingting-db Docker container published on :5440. All business writes use APIs.
An exclusive manifest makes repeat runs read-only and blocks uncertain retries.
Never use a production database copy. Existing catalog/QA records are preserved.

Optional --backdate-ledger changes ONLY timestamps on exact new fixture ledger
IDs, after checking their ownership and recording them in the manifest. This is
local historical fixture setup, not a supported business API operation. Amounts,
balances, IDs and ordering are unchanged. No application migration is involved.
"""
import argparse
import datetime as dt
import ipaddress
import json
import socket
import subprocess
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


MARKER = 'QA • OP26 '
REFERENCE = 'QA-OP26-'
DEFAULT_OUTPUT = Path('/tmp/nepoprod-qa/operational-fixtures.json')


def local_origin(url):
    parsed = urlparse(url)
    if (parsed.scheme != 'http' or parsed.hostname not in ('localhost', '127.0.0.1', '::1')
            or parsed.port != 3090 or parsed.username or parsed.password
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment):
        raise ValueError('Only the isolated http://localhost:3090 API is permitted.')
    if any(not ipaddress.ip_address(address[4][0]).is_loopback
           for address in socket.getaddrinfo(parsed.hostname, parsed.port)):
        raise ValueError('The local API hostname must resolve only to loopback addresses.')
    return url.rstrip('/')


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('Fixture requests may not follow redirects.')


class LocalApi:
    def __init__(self, url, password):
        self.url = local_origin(url)
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirects())
        self.token = None
        self.tokens = {}
        for role in ('admin', 'giaonhan'):
            self.tokens[role] = self.call('/auth/login', {'identifier': role, 'password': password})['token']
        self.token = self.tokens['admin']

    def call(self, path, data=None, method=None, role='admin'):
        if not path.startswith('/') or path.startswith('//'):
            raise ValueError('API paths must be local relative paths.')
        headers = {'Content-Type': 'application/json'}
        token = self.tokens.get(role) if hasattr(self, 'tokens') else None
        if token:
            headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(self.url + '/api' + path,
                                     data=json.dumps(data).encode() if data is not None else None,
                                     headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f'{path}: HTTP {error.code}: {error.read().decode()}') from error

    def items(self, path):
        result = []
        page = 1
        while True:
            data = self.call(f'{path}{"&" if "?" in path else "?"}page={page}&pageSize=100&limit=100')
            if isinstance(data, list):
                return data
            rows = data['items']
            result.extend(rows)
            if len(result) >= data.get('total', len(result)) or not rows:
                return result
            page += 1


def local_sql(sql):
    """Pinned Docker/local database only; never reads an environment DB URL."""
    ports = subprocess.check_output(['docker', 'port', 'tingting-db', '5432/tcp'], text=True)
    if ':5440' not in ports or any(':5440' not in line for line in ports.splitlines()):
        raise RuntimeError('Expected tingting-db published only on local development port 5440.')
    return subprocess.check_output(['docker', 'exec', '-i', 'tingting-db', 'psql', '-X', '-q',
                                    '-U', 'postgres', '-d', 'tingting', '-v', 'ON_ERROR_STOP=1', '-At'],
                                   input=sql, text=True).strip()


def save(path, manifest):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(path)


def seed(args):
    api = LocalApi(args.url, args.password)
    if args.output.exists():
        existing = json.loads(args.output.read_text())
        if existing.get('status') != 'complete' or existing.get('marker') != MARKER:
            raise RuntimeError('An incomplete/foreign manifest exists. Reconcile its exact operations before retrying; no automatic mutation replay.')
        expected = {row['id'] for row in existing['trips']}
        actual = {row['id'] for row in api.items('/trips') if (row.get('customerReference') or '').startswith(REFERENCE)}
        if expected != actual:
            raise RuntimeError('Completed manifest differs from the local dataset; refusing new writes.')
        print(json.dumps({'status': 'already_seeded', 'trips': len(actual), 'manifest': str(args.output)}))
        return

    catalogs = {name: api.items('/' + name) for name in
                ('customers', 'suppliers', 'routes', 'drivers', 'trucks', 'cargo-types', 'container-types', 'expense-categories')}
    if any(row['name'].startswith(MARKER) for row in catalogs['customers']):
        raise RuntimeError('Operational markers already exist without the matching manifest. Refusing duplicates.')
    gps = api.call('/admin/gps-settings')
    if gps.get('username') and gps.get('passwordSet'):
        raise RuntimeError('GPS provider is configured; refuse trip completion that could call an external provider.')
    if int(local_sql('SELECT count(*) FROM push_subscriptions;')):
        raise RuntimeError('Local push subscriptions exist; refuse notifications that could leave localhost.')
    push_configured = bool(api.call('/notifications/vapid-key').get('publicKey'))
    baseline_ledger_id = int(local_sql('SELECT coalesce(max(id), 0) FROM ledger;'))
    occupied = {(r['driver_id'], r['date']) for r in json.loads(local_sql(
        "SELECT coalesce(json_agg(x), '[]') FROM (SELECT driver_id, date FROM driver_work_days) x;"))}
    existing_trips = api.items('/trips')
    busy = {t['truckId'] for t in existing_trips if t['status'] == 'IN_TRANSIT'}
    trucks = [t for t in catalogs['trucks'] if t['status'] == 'ACTIVE' and t['id'] not in busy and t['id'] != 2]
    drivers = [d for d in catalogs['drivers'] if d['status'] == 'ACTIVE']
    if len(trucks) < 3 or len(drivers) < 3:
        raise RuntimeError('Need three available local trucks/drivers; existing trips will not be changed.')

    today = dt.date.today()
    current = today.replace(day=1)
    previous = (current - dt.timedelta(days=1)).replace(day=1)
    manifest = {'marker': MARKER, 'status': 'in_progress', 'createdAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'origin': api.url, 'baselineLedgerId': baseline_ledger_id,
                'providerPreflight': {'gpsConfigured': False, 'pushSubscriptions': 0, 'pushConfigured': push_configured},
                'operations': [], 'customers': [], 'suppliers': [], 'routes': [], 'trips': [], 'expenses': [],
                'tripExpenses': [], 'advances': [], 'payments': []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as output:
        json.dump(manifest, output, ensure_ascii=False)

    def write(path, data, method='POST', role='admin'):
        operation = {'method': method, 'path': path, 'role': role, 'request': data, 'status': 'pending'}
        manifest['operations'].append(operation)
        save(args.output, manifest)
        result = api.call(path, data, method, role)
        operation.update(status='complete', response=result)
        save(args.output, manifest)
        return result

    customer_names = [
        'Công ty Xuất nhập khẩu Nông sản Đồng Bằng', 'Kho lạnh và Thực phẩm Bình Minh',
        'Công ty Bao bì Công nghiệp Trường Sơn', 'Dệt may Xuất khẩu Hòa Phát Miền Bắc',
        'Thiết bị Điện và Cơ khí Nam Thành', 'Công ty Gỗ Nội thất An Nhiên',
        'Hợp tác xã Nông sản Sông Hồng', 'Công ty Phân phối Hàng tiêu dùng Việt Hưng',
        'Vật liệu Xây dựng Đông Hải', 'Công ty Linh kiện Điện tử Bắc Thành',
        'Thương mại và Chế biến Thủy sản Cát Hải', 'Công ty Nhựa Kỹ thuật Hưng Thịnh',
        'Trung tâm Phân phối Dược phẩm An Tâm', 'Công ty Thương mại Máy móc Đại Việt',
        'Xuất nhập khẩu Hàng gia dụng Phú An', 'Nhà xe Liên tỉnh Biển Đông',
        'Vận tải Container Hợp tác Miền Bắc', 'Dịch vụ Vận chuyển Cảng Xanh',
    ]
    for i, name in enumerate(customer_names):
        manifest['customers'].append(write('/customers', {'name': MARKER + name,
            'contactPerson': f'Điều phối mẫu {i + 1:02d}', 'contactInfo': 'Dữ liệu vận hành giả lập trên máy cục bộ',
            'creditLimit': {2: 15000000, 5: 20000000}.get(i, [30000000, 60000000, 90000000, 120000000][i % 4]),
            'isCarrier': i >= 15, 'debitNoteMode': 'PER_BATCH' if i % 4 == 1 else 'MONTHLY'}))
    for i, name in enumerate(['Nhiên liệu An Phúc', 'Trạm dầu Đông Cảng', 'Gara Cơ khí Thành An',
                             'Phụ tùng Đầu kéo Bắc Nam', 'Dịch vụ Nâng hạ Cảng Xanh',
                             'Vật tư và Lốp xe Đại Thành', 'Dịch vụ Kiểm định Hàng hóa Minh An', 'Bảo dưỡng Rơ moóc Bình An']):
        manifest['suppliers'].append(write('/suppliers', {'name': MARKER + name, 'shortName': name,
            'isFuelSupplier': i < 2, 'note': 'Dữ liệu giả lập; không có thông tin liên hệ thật.'}))
    route_specs = [('Cảng Đình Vũ', 'Khu công nghiệp Quang Minh', 145),
                   ('Cảng Lạch Huyện', 'Khu công nghiệp Yên Phong', 165),
                   ('Hải Phòng', 'Kho trung chuyển Hưng Yên', 105),
                   ('Hải Phòng', 'Khu công nghiệp Phố Nối', 115),
                   ('Hà Nội', 'Cửa khẩu Hữu Nghị', 175),
                   ('Hải Phòng', 'Kho phân phối Vinh', 360)]
    for origin, destination, km in route_specs:
        route = write('/routes', {'name': MARKER + origin + ' – ' + destination, 'distanceKm': km,
            'tollsStations': 2, 'driverSalary': 550000 + km * 900,
            'defaultLegs': [{'origin': origin, 'destination': destination, 'km': km, 'loadingType': 'HANG'}]})
        manifest['routes'].append(route)
        for trailer in ('20FT', '40FT'):
            write('/road-allowances', {'routeId': route['id'], 'trailerType': trailer, 'baseAmount': 600000 + km * 2000})
    cargo = write('/cargo-types', {'name': MARKER + 'Hàng công nghiệp và tiêu dùng đóng container', 'requiresPhotos': False})
    for i, customer in enumerate(manifest['customers']):
        for offset in (0, 1):
            route_index = (i + offset) % 6
            write('/pricing-tables', {'customerId': customer['id'], 'routeId': manifest['routes'][route_index]['id'],
                'price': 4000000 + route_specs[route_index][2] * 16000})

    for i in range(40):
        status = ('LOCKED' if i < 12 or 18 <= i < 22 else 'COMPLETED' if i < 28 else
                  'CANCELED' if i < 32 else 'CREATED' if i < 36 else 'IN_TRANSIT')
        day = (previous + dt.timedelta(days=i) if i < 18 else
               current + dt.timedelta(days=(i - 18) % max(1, today.day - 1)) if i < 32 else today)
        external = i % 4 == 3
        route_index = i % 6
        origin, destination, km = route_specs[route_index]
        customer = manifest['customers'][i % 18]
        candidates = [d for d in drivers if (d['id'], day.isoformat()) not in occupied]
        if not external and not candidates:
            raise RuntimeError(f'No unoccupied driver/day for {day}; existing attendance must be preserved.')
        driver = candidates[i % len(candidates)] if candidates else None
        truck = trucks[(i - 36) if 36 <= i <= 38 else i % len(trucks)]
        payload = {'customerId': customer['id'], 'routeId': manifest['routes'][route_index]['id'],
                   'cargoTypeId': cargo['id'], 'containerTypeId': next(c['id'] for c in catalogs['container-types'] if c['code'] == ('20DC' if i % 3 == 0 else '40HC')),
                   'departureDate': day.isoformat(), 'customerReference': REFERENCE + f'{i + 1:03d}',
                   'carrierType': 'EXTERNAL' if external else 'OWN'}
        revenue = 4000000 + km * 16000 + (i % 3) * 350000
        if i % 10 == 6:
            revenue = 1800000 + km * 3000  # A small number of loss-making runs.
        if external:
            payload.update(externalCarrierId=manifest['customers'][15 + i % 3]['id'],
                           externalFreightCost=round(revenue * .72), externalPlateNumber=f'QA-EXT-{i + 1:03d}',
                           externalDriverName=f'Tài xế đối tác mẫu {i + 1:02d}')
        else:
            payload.update(truckId=truck['id'], driverId=driver['id'])
        trip = write('/trips', payload)
        figures = {'version': trip['version'], 'fuelMode': 'FLAT_RATE', 'fuelLitersOverride': 0 if external else round(km * .32),
                   'fuelSupplementLiters': 0, 'fuelActualUnitPrice': 22500,
                   'tollsDiscount': 0, 'tollsAddition': 0, 'tollsStations': 2, 'hasReturnCargo': False,
                   'roadAllowanceOverride': 0 if external else 600000 + km * 2000,
                   'driverSalary': 0 if external else 550000 + km * 900, 'revenue': revenue, 'tripWageDays': 1,
                   'notes': MARKER + 'Lô hàng giả lập để kiểm thử vận hành và công nợ.'}
        if not external:
            figures['fuelSupplierId'] = manifest['suppliers'][i % 2]['id']
        trip = write(f"/trips/{trip['id']}/pre-departure", figures, 'PUT')
        if 22 <= i < 28:
            fee = write('/forwarder/me/expenses', {'tripId': trip['id'], 'expenseType': 'LIFTING',
                'buyAmount': 250000 + (i - 22) * 50000, 'sellAmount': 350000 + (i - 22) * 50000,
                'settlementMethod': 'FORWARDER_ADVANCE', 'supplierId': manifest['suppliers'][4]['id'],
                'invoiceNumber': REFERENCE + f'GN-{i:03d}', 'invoiceDate': day.isoformat(),
                'note': MARKER + 'Nâng hạ container; chứng từ giả lập.'}, role='giaonhan')
            manifest['tripExpenses'].append(fee)
        if status == 'CANCELED':
            trip = write(f"/trips/{trip['id']}/cancel", {})
        elif status != 'CREATED':
            trip = write(f"/trips/{trip['id']}/dispatch", {})
            if not external:
                occupied.add((driver['id'], day.isoformat()))
            if status != 'IN_TRANSIT':
                trip = write(f"/trips/{trip['id']}/complete", {})
                trip = write(f"/trips/{trip['id']}/actuals", {'version': trip['version'], 'fuelMode': 'FLAT_RATE',
                    'completedAt': day.isoformat() + 'T18:00:00+07:00'}, 'PUT')
                if status == 'LOCKED':
                    trip = write(f"/trips/{trip['id']}/lock", {'confirmNoPhoto': True})
        manifest['trips'].append(trip)
        save(args.output, manifest)
        print(f"Trip {i + 1}/40: {trip['tripCode']} {trip['status']}", flush=True)

    categories = [c for c in catalogs['expense-categories'] if not c['isRenewable'] and not c['name'].startswith('QA')]
    for i in range(16):
        expense = write('/expenses', {'expenseDate': (previous + dt.timedelta(days=i + 1) if i < 8 else
                           current + dt.timedelta(days=min(i - 7, today.day - 1))).isoformat(),
            'supplierId': manifest['suppliers'][2 + i % 6]['id'], 'categoryId': categories[i % len(categories)]['id'],
            'truckId': trucks[i % len(trucks)]['id'], 'amount': 850000 + i * 225000,
            'paymentStatus': 'PAID' if i % 4 == 0 else 'UNPAID', 'receiptId': REFERENCE + f'CP-{i + 1:03d}',
            'note': MARKER + ['Bảo dưỡng định kỳ hệ thống phanh', 'Thay vật tư lọc dầu động cơ',
                             'Kiểm tra và thay phụ tùng gầm', 'Bảo dưỡng hệ thống điện đầu kéo'][i % 4]})
        manifest['expenses'].append(expense)
    for i, trip in enumerate(manifest['trips'][:28]):
        if i % 3 == 2:
            continue
        amount = round(float(trip['revenue']) * (1 if i % 4 == 0 else .4))
        payment = {'customerId': trip['customerId'], 'receiptId': REFERENCE + f'THU-{i + 1:03d}',
                   'payments': [{'tripId': trip['id'], 'amount': amount}]}
        write('/payments/receive', payment)
        manifest['payments'].append({'type': 'CUSTOMER', **payment})
    for supplier in manifest['suppliers'][:6]:
        entries = api.items(f"/ledger?entityType=VENDOR&entityId={supplier['id']}")
        balance = sum(float(r['credit']) - float(r['debit']) for r in entries)
        if balance > 0:
            payment = {'supplierId': supplier['id'], 'receiptId': REFERENCE + f"CHI-{supplier['id']}",
                       'amount': round(balance * .35), 'date': today.isoformat()}
            write('/payments/vendor', payment)
            manifest['payments'].append({'type': 'VENDOR', **payment})
    for carrier in manifest['customers'][15:]:
        trips = [t for t in manifest['trips'][:28] if t.get('externalCarrierId') == carrier['id']]
        balance = sum(float(t['externalFreightCost']) for t in trips)
        if balance:
            payment = {'supplierId': carrier['id'], 'receiptId': REFERENCE + f"NX-{carrier['id']}",
                       'amount': round(balance * .3), 'date': today.isoformat()}
            write('/payments/carrier', payment)
            manifest['payments'].append({'type': 'CARRIER', **payment})
    for i, amount in enumerate((3000000, 4500000, 1800000)):
        advance = write('/forwarder/me/advance-requests', {'amount': amount,
                        'reason': MARKER + ['Chi phí nâng hạ cảng tuần này', 'Tạm ứng khai thác hàng xuất khẩu', 'Dự phòng phí kiểm hóa'][i]}, role='giaonhan')
        if i < 2:
            advance = write(f"/advance-requests/{advance['id']}/approve", {})
        manifest['advances'].append(advance)

    trip_by_id = {t['id']: t for t in manifest['trips']}
    expense_by_id = {e['id']: e for e in manifest['expenses']}
    customer_ids = {c['id'] for c in manifest['customers']}
    supplier_ids = {s['id'] for s in manifest['suppliers']}
    ledger = [r for r in api.items('/ledger') if r['id'] > baseline_ledger_id and (
        (r['entityType'] in ('CUSTOMER', 'CARRIER') and r['entityId'] in customer_ids) or
        (r['entityType'] == 'VENDOR' and r['entityId'] in supplier_ids) or
        (r['entityType'] == 'DRIVER' and r.get('txnId') in trip_by_id))]
    manifest['ledgerIds'] = [r['id'] for r in ledger]
    manifest['historicalTimestampAdjustments'] = []
    if args.backdate_ledger:
        for row in ledger:
            if row['txnType'] == 'VENDOR_EXPENSE' and row.get('txnId') in expense_by_id:
                day = expense_by_id[row['txnId']]['expenseDate'][:10]
            elif row.get('txnId') in trip_by_id and row['txnType'] not in ('PAYMENT_RECEIVED', 'VENDOR_PAYMENT'):
                day = trip_by_id[row['txnId']]['departureDate'][:10]
            else:
                day = today.isoformat()
            manifest['historicalTimestampAdjustments'].append({'id': row['id'], 'timestamp': day + 'T12:00:00+07:00'})
        save(args.output, manifest)
        ids = ','.join(str(int(r['id'])) for r in ledger)
        before = json.loads(local_sql(f"SELECT json_agg(x) FROM (SELECT * FROM ledger WHERE id IN ({ids}) ORDER BY id) x;"))
        manifest['ledgerBeforeTimestampAdjustment'] = before
        save(args.output, manifest)
        values = ','.join(f"({int(r['id'])},'{r['timestamp']}'::timestamptz)" for r in manifest['historicalTimestampAdjustments'])
        local_sql(f"BEGIN; SET LOCAL lock_timeout='5s'; UPDATE ledger SET timestamp=v.ts FROM (VALUES {values}) AS v(id,ts) WHERE ledger.id=v.id AND ledger.id>{baseline_ledger_id}; COMMIT;")
        after = json.loads(local_sql(f"SELECT json_agg(x) FROM (SELECT * FROM ledger WHERE id IN ({ids}) ORDER BY id) x;"))
        if [{k: v for k, v in r.items() if k != 'timestamp'} for r in before] != [{k: v for k, v in r.items() if k != 'timestamp'} for r in after]:
            raise RuntimeError('Unexpected ledger content change; inspect recorded before snapshot immediately.')
        # Local fixture timestamp changes bypass application cache invalidation.
        # Remove only NEPO report caches; never FLUSHDB or unrelated keys.
        subprocess.run(['docker', 'exec', 'tingting-redis', 'redis-cli', 'EVAL',
                        "local keys=redis.call('KEYS','reports:*'); for _,k in ipairs(keys) do redis.call('DEL',k) end; return #keys", '0'],
                       check=True, stdout=subprocess.DEVNULL)
        manifest['ledgerTimestampIntegrity'] = 'Amounts, balances, IDs and all other fields unchanged.'

    manifest['summary'] = {
        'customers': len(manifest['customers']), 'suppliers': len(manifest['suppliers']), 'routes': len(manifest['routes']),
        'trips': len(manifest['trips']), 'statuses': dict(Counter(t['status'] for t in manifest['trips'])),
        'carriers': dict(Counter(t['carrierType'] for t in manifest['trips'])),
        'expenses': len(manifest['expenses']), 'expenseStatuses': dict(Counter(e['paymentStatus'] for e in manifest['expenses'])),
        'revenue': sum(float(t['revenue']) for t in manifest['trips']),
        'cost': sum(float(t['totalCost']) for t in manifest['trips']),
        'receivables': api.call('/reports/receivables-summary'), 'payables': api.call('/reports/payables-summary'),
        'dashboard': api.call('/reports/dashboard'),
    }
    manifest['status'] = 'complete'
    save(args.output, manifest)
    print(json.dumps(manifest['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:3090')
    parser.add_argument('--password', default='admin123')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--backdate-ledger', action='store_true', help='Local fixture-only timestamp setup on exact new ledger IDs.')
    seed(parser.parse_args())

#!/usr/bin/env python3
"""Create synthetic UI-audit records on a freshly seeded localhost database.

Creates business records on purpose; never point this at a production copy.
Usage: python3 e2e/seed_ui_audit.py --output /tmp/nepo-qa/fixture.json
Then run ui_route_audit.py with that --fixtures path.
"""
import argparse
import datetime
import json
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


def seed(url, password):
    if urlparse(url).hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SystemExit('Synthetic fixtures are restricted to localhost.')
    token = None
    def call(path, data=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request(url + '/api' + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f'{path}: {error.code} {error.read().decode()}') from error
    token = call('/auth/login', {'identifier': 'admin', 'password': password})['token']
    admin_token = token
    stamp = datetime.datetime.now().strftime('%m%d%H%M%S')
    day = datetime.date.today().isoformat()
    def items(path):
        data = call(path)
        return data if isinstance(data, list) else data['items']
    driver = next(row for row in items('/drivers') if row.get('phone') == '0900000003')
    truck = items('/trucks')[0]
    supplier = next(row for row in items('/suppliers') if not row.get('isFuelSupplier'))
    category = items('/expense-categories')[0]
    container = items('/container-types')[0]
    customer = call('/customers', {'name': 'QA Công ty vận tải Hải Phòng ' + stamp})
    route = call('/routes', {'name': 'QA Hải Phòng – Hà Nội ' + stamp, 'distanceKm': 120, 'defaultLegs': [{'origin': 'Hải Phòng', 'destination': 'Hà Nội', 'km': 120, 'loadingType': 'HANG'}]})
    cargo = call('/cargo-types', {'name': 'QA Hàng tổng hợp ' + stamp})
    call('/pricing-tables', {'customerId': customer['id'], 'routeId': route['id'], 'price': 4500000})
    trip = call('/trips', {'customerId': customer['id'], 'routeId': route['id'], 'cargoTypeId': cargo['id'], 'truckId': truck['id'], 'driverId': driver['id'], 'containerTypeId': container['id'], 'departureDate': day, 'customerReference': 'QA-' + stamp})
    trailer = call('/trailers', {'licensePlate': 'QA-' + stamp, 'type': '40FT'})
    expense = call('/expenses', {'expenseDate': day, 'supplierId': supplier['id'], 'categoryId': category['id'], 'truckId': truck['id'], 'amount': 1500000, 'paymentStatus': 'UNPAID', 'note': 'Synthetic QA expense'})
    template = call('/debit-note-templates', {'name': 'QA template ' + stamp})
    token = call('/auth/login', {'identifier': 'giaonhan', 'password': password})['token']
    forwarder_token = token
    advance = call('/forwarder/me/advance-requests', {'amount': 1000000, 'reason': 'Synthetic QA advance ' + stamp})
    token = admin_token
    call(f"/advance-requests/{advance['id']}/approve", {})
    token = forwarder_token
    settlement = call('/forwarder/me/advance-settlements', {'refundAmount': 1000000, 'advanceRequestIds': [advance['id']], 'tripExpenseIds': [], 'note': 'Synthetic QA settlement'})
    return {name: row['id'] for name, row in dict(customer=customer, route=route, cargo=cargo, trip=trip, truck=truck, trailer=trailer, supplier=supplier, expense=expense, template=template, settlement=settlement).items()}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:3090')
    parser.add_argument('--password', default='admin123')
    parser.add_argument('--output', type=Path, default=Path('/tmp/nepo-qa/fixture.json'))
    args = parser.parse_args()
    result = seed(args.url.rstrip('/'), args.password)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2))
    print(json.dumps(result))

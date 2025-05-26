# Cẩm nang Sử dụng Hệ thống Quản lý Vận tải NePO

## Giới thiệu

**Cách theo dõi tiến độ:** Mỗi chức năng (user story) sẽ có trạng thái:
*   `[ ]` Chưa hoàn thành / Đang phát triển
*   `[x]` Đã hoàn thành

---

## I. Vai trò: Quản lý (Manager)

### 1. Epic: Quản lý Báo cáo và Phân tích Kinh doanh

*   **Mục tiêu:** Theo dõi sức khỏe tài chính, hiệu quả hoạt động và đưa ra quyết định dựa trên dữ liệu.

*   **User Stories:**
    *   `[ ]` **Xem báo cáo Lợi nhuận & Doanh thu:** Hiểu rõ doanh thu và lợi nhuận được tạo ra bởi từng xe, được phân bổ theo từng tháng. Báo cáo này thường được trình bày dưới dạng biểu đồ cột ngang để dễ dàng so sánh hiệu suất giữa các xe và qua các tháng.
    *   `[ ]` **Phân tích Chi tiết chi phí:** Xem xét kỹ lưỡng các khoản chi phí theo từng hạng mục (ví dụ: nhiên liệu, sửa chữa, lương), theo từng biển số xe cụ thể và theo tháng. Trên máy tính, dữ liệu này thường hiển thị dạng bảng; trên điện thoại, mỗi xe có thể hiển thị như một "thẻ" thông tin với biểu đồ chi phí riêng.
    *   `[ ]` **Theo dõi Doanh thu/Chi phí theo từng Phương tiện:**
        *   Chọn một biển số xe và một tháng cụ thể để xem báo cáo chi tiết.
        *   Xem tổng quan về tổng chi phí, tổng cước vận chuyển và tổng lợi nhuận cho lựa chọn đó.
        *   Xem bảng kê chi tiết các chuyến hàng trong tháng của xe đó, bao gồm: ngày tháng, mô tả chuyến đi, số container, tuyến đường, chi phí dầu (lít và đồng), chi phí cầu đường, tổng chi phí chuyến, cước vận chuyển thu về, và lợi nhuận của chuyến.
        *   Xem danh sách các chi phí khác phát sinh cho xe trong tháng (ngoài chi phí chuyến đi) như phí gửi xe, Epass, lương lái xe.
    *   `[ ]` **Xuất dữ liệu báo cáo ra Excel:** Tải về các báo cáo (Lợi nhuận & Doanh thu, Chi tiết chi phí, Theo dõi Doanh thu/Chi phí phương tiện, Báo cáo Công nợ) dưới dạng file Excel để lưu trữ hoặc phân tích thêm. Nút "Xuất Excel" thường nằm ở vị trí dễ thấy trên trang báo cáo.
    *   `[ ]` **Xem và theo dõi Báo cáo Công nợ:**
        *   Chọn tháng để xem công nợ.
        *   Xem bảng kê các khoản phải thu từ khách hàng và các khoản phải trả cho đối tác, cùng với ghi chú nếu có.

### 2. Epic: Quản lý Lịch vận chuyển

*   **Mục tiêu:** Lập kế hoạch, điều phối và theo dõi tất cả các chuyến vận chuyển một cách hiệu quả.

*   **User Stories:**
    *   `[ ]` **Xem danh sách kế hoạch vận chuyển:** Hiển thị tất cả các chuyến đi đã lên kế hoạch hoặc đang thực hiện với các cột thông tin chính như: Ngày tháng, Biển số xe, Đối tác (nếu có), Diễn giải (mô tả chuyến đi), Tuyến đường, Trạng thái chuyến, Số km vận chuyển (có hàng và rỗng), Chi phí dầu (lít, đơn giá, tổng tiền), Định mức chi phí đi đường, và các Chi phí khác.
    *   `[ ]` **Tạo kế hoạch vận chuyển mới:**
        *   Nhấn nút "+" (thường ở góc dưới màn hình) để mở form tạo mới.
        *   Nhập các thông tin cần thiết: Ngày vận chuyển (chọn từ lịch), Diễn giải, Khách hàng (chọn từ danh sách, có thể thêm nhanh khách hàng mới), Số lượng container, Loại container (chọn từ danh sách, có thể thêm nhanh loại mới), Tuyến đường (điểm đi, điểm đến, có thể thêm nhanh tuyến mới).
        *   Nhập Cước vận chuyển thu từ khách hàng và chọn Biển số xe thực hiện (có thể thêm nhanh xe mới).
        *   Nếu thuê ngoài, nhập Cước thuê vận chuyển và chọn Đối tác (có thể thêm nhanh đối tác mới).
        *   Nhập Thông tin container chi tiết: Số container, Số seal.
        *   Nhập Ngày hạ hàng dự kiến.
        *   *Lưu ý: Các trường không bắt buộc nếu để trống sẽ mặc định là "-" (cho chữ) hoặc 0 (cho số).*
    *   `[ ]` **Chỉnh sửa kế hoạch vận chuyển:** Thay đổi các thông tin đã nhập cho một kế hoạch vận chuyển sau khi đã tạo.
    *   `[ ]` **Xóa kế hoạch vận chuyển:** Loại bỏ một kế hoạch vận chuyển khỏi hệ thống (thường chỉ áp dụng cho các kế hoạch ở trạng thái "Nháp" hoặc chưa phát sinh giao dịch).
    *   `[ ]` **Cập nhật trạng thái chuyến hàng:** Thay đổi trạng thái của chuyến đi, ví dụ từ "Nháp" -> "Lên lịch" -> "Đang chạy" -> "Hoàn thành". Trạng thái "Lên lịch" thường là mặc định khi Quản lý tạo.
    *   `[ ]` **Quản lý thông tin chi tiết container:** Đảm bảo thông tin số container, số seal, ngày hạ hàng là chính xác cho mỗi chuyến.

### 3. Epic: Quản lý Nhân sự

*   **Mục tiêu:** Quản lý thông tin và tài khoản truy cập của tất cả nhân viên trong công ty.

*   **User Stories:**
    *   `[ ]` **Xem danh sách nhân viên:** Hiển thị bảng thông tin các nhân viên.
    *   `[ ]` **Thêm nhân viên mới:**
        *   Nhấn nút "+" để mở form tạo mới.
        *   Nhập các thông tin: Tên nhân viên, Tên đăng nhập (để vào hệ thống), Mật khẩu, Email, Chức vụ (chọn từ: Quản lý, Kế toán, Giao nhận, Lái xe).
    *   `[ ]` **Chỉnh sửa thông tin nhân viên:** Cập nhật lại thông tin cho nhân viên đã có.
    *   `[ ]` **Xóa/Vô hiệu hóa nhân viên:** Loại bỏ hoặc khóa tài khoản của nhân viên đã nghỉ việc. (Quy trình cụ thể cần được xác định: xóa hẳn hay chỉ vô hiệu hóa).

### 4. Epic: Quản lý Khách hàng

*   **Mục tiêu:** Duy trì cơ sở dữ liệu đầy đủ và chính xác về các khách hàng sử dụng dịch vụ.

*   **User Stories:**
    *   `[ ]` **Xem danh sách khách hàng:** Hiển thị bảng thông tin các khách hàng.
    *   `[ ]` **Thêm khách hàng mới:**
        *   Nhấn nút "+" để mở form tạo mới.
        *   Nhập các thông tin: Tên khách hàng, Địa chỉ, Số điện thoại.
    *   `[ ]` **Chỉnh sửa thông tin khách hàng:** Cập nhật lại thông tin cho khách hàng đã có.
    *   `[ ]` **Xóa khách hàng:** Loại bỏ thông tin khách hàng không còn giao dịch (cần cân nhắc nếu đã có lịch sử giao dịch).

### 5. Epic: Quản lý Đối tác Vận tải

*   **Mục tiêu:** Quản lý thông tin các nhà cung cấp dịch vụ vận tải hoặc các đối tác liên quan.

*   **User Stories:**
    *   `[ ]` **Xem danh sách đối tác:** Hiển thị bảng thông tin các đối tác.
    *   `[ ]` **Thêm đối tác mới:**
        *   Nhấn nút "+" để mở form tạo mới.
        *   Nhập các thông tin: Tên đối tác, Địa chỉ, Số điện thoại.
    *   `[ ]` **Chỉnh sửa thông tin đối tác:** Cập nhật lại thông tin cho đối tác đã có.
    *   `[ ]` **Xóa đối tác:** Loại bỏ thông tin đối tác không còn hợp tác (cần cân nhắc nếu đã có lịch sử giao dịch).

### 6. Epic: Quản lý Phương tiện và Tài sản Vận tải

*   **Mục tiêu:** Quản lý toàn bộ thông tin về đội xe, các loại container, định mức nhiên liệu và lịch sử bảo dưỡng.

*   **User Stories:**
    *   `[ ]` **Quản lý Biển số xe:**
        *   Xem danh sách các xe hiện có.
        *   Thêm biển số xe mới.
        *   Chỉnh sửa thông tin xe (nhấn vào dòng để sửa).
        *   Xóa biển số xe (nhấn vào biểu tượng thùng rác).
    *   `[ ]` **Quản lý Loại container:**
        *   Xem danh sách các loại container (ví dụ: 20'DC, 40'HC).
        *   Thêm loại container mới.
        *   Chỉnh sửa thông tin loại container.
        *   Xóa loại container.
    *   `[ ]` **Quản lý Định mức dầu:**
        *   Cho phép nhập định mức dầu riêng cho từng xe, gồm 2 loại: "Định mức hàng" (áp dụng cho km có hàng) và "Định mức vỏ" (áp dụng cho km chạy vỏ/không hàng).
        *   Khi tính toán lượng dầu cấp cho chuyến đi, phần mềm sẽ tự động tra cứu định mức của từng xe để áp dụng vào công thức tính toán.
        *   Công thức tính: **Số lít dầu được cấp = Số km hàng * Định mức hàng + Số km vỏ * Định mức vỏ + Bổ sung**.
        *   Mức bổ sung (mặc định 3L/chuyến) là giá trị do Quản lý cài đặt, áp dụng cho tất cả các xe, có thể thay đổi trong phần cấu hình.
        *   Đối với các tuyến đường công ty đã khoán số lít dầu theo tuyến, cho phép kế toán nhập trực tiếp số lít dầu vào phần nhập liệu kế hoạch vận chuyển. Nếu đã nhập số lít dầu, phần mềm sẽ lấy giá trị này, không tính toán theo công thức nữa. Nếu không nhập số lít dầu, phần mềm sẽ tự động tính dựa trên số km hàng, số km vỏ và định mức của xe.
        *   Không cần nhập bảng định mức dầu theo tuyến trong UI, chỉ cần nhập trực tiếp số lít dầu cho các tuyến khoán khi cần.
    *   `[ ]` **Quản lý Bảo dưỡng (Thay lốp xe):**
        *   Xem lịch sử thay lốp cho các xe, bao gồm: Biển số xe, Ngày thay lốp, Thời hạn bảo hành, Số lượng, Đơn giá, Tổng tiền, Ghi chú.
        *   Lọc danh sách thay lốp theo biển số xe.
        *   Thêm, sửa, xóa thông tin một lần thay lốp.

---

## II. Vai trò: Kế toán (Accountant)

Kế toán viên chịu trách nhiệm về các vấn đề tài chính, chi phí và công nợ liên quan đến hoạt động vận tải. Người dùng Kế toán sẽ thấy thanh điều hướng (sidebar) bên trái bao gồm các mục chính: Lịch vận chuyển, Chi phí, và Công nợ.

### 1. Epic: Quản lý Chi tiết Lịch vận chuyển và Chi phí Phát sinh

*   **Mục tiêu:** Đảm bảo tính chính xác của dữ liệu tài chính và chi phí cho mỗi chuyến đi, đồng thời cập nhật các thông tin vận hành liên quan.

*   **User Stories:**
    *   `[ ]` **Xem danh sách kế hoạch vận chuyển:** Hiển thị tất cả các chuyến đi với các thông tin tương tự như Quản lý: Ngày tháng, Biển số xe, Đối tác, Diễn giải, Tuyến đường, Trạng thái, Km vận chuyển (có hàng/rỗng), Chi phí dầu (lít, đơn giá, tổng tiền), Định mức đi đường, và các Chi phí khác.
    *   `[ ]` **Chỉnh sửa thông tin trên lịch vận chuyển:**
        *   Nhấp trực tiếp vào các ô trong bảng dữ liệu lịch vận chuyển để sửa thông tin (ví dụ: số km thực tế, lượng dầu tiêu thụ, các chi phí).
        *   Khi chọn ô "Chi phí khác", một cửa sổ chi tiết sẽ hiện ra để xem và nhập các khoản chi phí nhỏ lẻ cho chuyến đi đó (ví dụ: tiền vé cầu đường, phí nâng hạ container). Trong cửa sổ này, có thể thêm dòng chi phí mới, xóa dòng không cần thiết, và lưu lại thay đổi.
    *   `[ ]` **Cập nhật trạng thái chuyến đi:**
        *   Thay đổi trạng thái của chuyến đi dựa trên tiến độ thực tế. Các trạng thái bao gồm:
            *   *Nháp:* Trạng thái mặc định nếu Kế toán tạo kế hoạch vận chuyển.
            *   *Lên lịch:* Trạng thái thường do Quản lý đặt sau khi duyệt.
            *   *Đang chạy:* Khi chuyến đi đang được thực hiện.
            *   *Hoàn thành:* Khi đã nhập ngày hạ hàng, xác nhận chuyến đi kết thúc.
    *   `[ ]` **Tạo kế hoạch vận chuyển mới:**
        *   Sử dụng nút "Thêm" (thường ở phía trên bảng dữ liệu) để mở form tạo mới kế hoạch vận chuyển.
        *   Điền các thông tin tương tự như khi Quản lý tạo, trạng thái mặc định sẽ là "Nháp".
    *   `[ ]` **Tự động điền định mức đi đường:** Hệ thống tự động điền giá trị "Định mức đi đường" dựa trên bảng định mức do Quản lý đã thiết lập sẵn (ví dụ: theo tuyến đường hoặc loại xe).
    *   `[ ]` **Tính toán chi phí dầu tự động:**
        *   Khi kế toán nhập số km hàng và số km vỏ, phần mềm sẽ tự động tính số lít dầu cấp cho chuyến đi theo công thức: **Số lít dầu được cấp = Số km hàng * Định mức hàng + Số km vỏ * Định mức vỏ + Bổ sung** (bổ sung mặc định 3L/chuyến, có thể thay đổi bởi Quản lý).
        *   Nếu kế toán nhập trực tiếp số lít dầu (áp dụng cho các tuyến khoán hoặc trường hợp đặc biệt), phần mềm sẽ lấy giá trị này và không tính toán theo công thức nữa.
        *   Định mức hàng và định mức vỏ được lưu theo từng xe, phần mềm sẽ tự động tra cứu theo biển số xe của chuyến đi.

### 2. Epic: Quản lý và Báo cáo Tổng hợp Chi phí Hoạt động

*   **Mục tiêu:** Theo dõi, ghi nhận đầy đủ và phân loại tất cả các chi phí vận hành của công ty, không chỉ chi phí theo chuyến.

*   **User Stories:**
    *   `[ ]` **Xem tổng hợp chi phí theo nhiều tiêu chí:** Hiển thị tổng chi phí theo từng hạng mục, theo từng biển số xe, và theo từng tháng. Các chi phí đã nhập trong phần Lịch vận chuyển sẽ được tự động cộng dồn vào các nhóm tương ứng (ví dụ: tổng chi phí dầu, tổng chi phí đi đường của một xe trong tháng).
    *   `[ ]` **Lọc và xem chi phí tùy chỉnh:**
        *   Sử dụng thanh điều khiển ở đầu trang để chọn xem chi phí cho một Biển số xe cụ thể hoặc cho tất cả các xe.
        *   Chọn Tháng báo cáo để giới hạn phạm vi dữ liệu.
    *   `[ ]` **Xem biểu đồ chi phí trực quan:** Dưới thanh điều khiển, một biểu đồ cột ngang sẽ hiển thị, với mỗi dòng là một loại chi phí và chiều dài cột thể hiện giá trị của chi phí đó. Tổng chi phí của lựa chọn hiện tại cũng sẽ được hiển thị.
    *   `[ ]` **Thêm các chi phí hoạt động chung (không theo chuyến cụ thể):** Kế toán có thể nhập các chi phí khác không nằm trong một kế hoạch vận chuyển cụ thể. Danh sách các chi phí có thể thêm bao gồm:
        *   `[ ]` Phí gửi xe (hàng tháng hoặc phát sinh).
        *   `[ ]` Chi phí sửa chữa / bảo dưỡng xe (các hạng mục không phải là thay lốp đã được Quản lý theo dõi riêng).
        *   `[ ]` Lương lái xe.
        *   `[ ]` Tiền bảo hiểm Trách nhiệm Dân sự (TNDS).
        *   `[ ]` Tiền bảo hiểm vật chất xe.
        *   `[ ]` Phí đường bộ (thu theo năm hoặc kỳ).
        *   `[ ]` Chi phí thay thế lốp xe (ghi nhận về mặt chi phí, còn việc quản lý vòng đời lốp, ngày thay, nhà cung cấp... do Quản lý thực hiện trong mục Phương tiện). *Khi tra cứu thông tin lốp xe theo biển số, hệ thống có thể cho biết lốp đã thay ngày nào và tuổi thọ lốp tính đến hiện tại là bao nhiêu ngày (thông tin này có thể liên kết từ mục quản lý phương tiện).*

### 3. Epic: Quản lý Công nợ

*   **Mục tiêu:** Theo dõi chính xác các khoản phải thu từ khách hàng và các khoản phải trả cho nhà cung cấp/đối tác.

*   **User Stories:**
    *   `[ ]` **Xem bảng tổng hợp công nợ:** Hiển thị các khoản phải thu và phải trả, được nhóm theo Tên đơn vị (khách hàng hoặc đối tác).
    *   `[ ]` **Lọc báo cáo công nợ theo tháng:** Chọn tháng cụ thể để xem tình hình công nợ trong khoảng thời gian đó.
    *   `[ ]` **Xuất báo cáo công nợ ra Excel:** Tải về file Excel chứa dữ liệu công nợ để lưu trữ hoặc sử dụng cho các mục đích khác. Nút "Xuất Excel" thường nằm ở vị trí dễ thấy.

---

## III. Vai trò: Giao nhận (Dispatcher/Forwarder)

Nhân viên giao nhận đóng vai trò quan trọng trong việc điều phối và theo dõi sát sao các chuyến hàng, đảm bảo hàng hóa được vận chuyển đúng lịch trình, an toàn và hiệu quả. Họ là cầu nối thông tin giữa quản lý, tài xế và khách hàng.

*(Lưu ý: Các chức năng dưới đây được xây dựng dựa trên các nhiệm vụ thông thường của Nhân viên Giao nhận và các tính năng hiện có của hệ thống NePO. Một số chức năng có thể được đề xuất để tối ưu hóa quy trình làm việc và sẽ được ghi chú rõ.)*

### 1. Epic: Điều phối và Theo dõi Sát sao Lịch vận chuyển

*   **Mục tiêu:** Đảm bảo các chuyến hàng được thực hiện một cách thông suốt, đúng tiến độ và giải quyết nhanh các vấn đề phát sinh.

*   **User Stories:**
    *   `[ ]` **Xem toàn bộ lịch vận chuyển:**
        *   Truy cập và xem danh sách chi tiết tất cả các kế hoạch vận chuyển, bao gồm thông tin: Ngày tháng, Biển số xe được phân công, Tài xế lái xe (nếu thông tin này được liên kết), Đối tác vận tải (nếu có), Diễn giải (mô tả, yêu cầu đặc biệt của chuyến đi), Tuyến đường chi tiết, Trạng thái hiện tại của chuyến hàng (Nháp, Lên lịch, Đang chạy, Hoàn thành), Thông tin container (số cont, số seal).
    *   `[ ]` **(Đề xuất) Tạo yêu cầu/kế hoạch vận chuyển nháp:**
        *   Khi có yêu cầu vận chuyển mới từ khách hàng hoặc bộ phận kinh doanh, Giao nhận có thể tạo một kế hoạch vận chuyển ở trạng thái "Nháp" với các thông tin ban đầu. Kế hoạch này sau đó có thể được Quản lý xem xét và chuyển thành "Lên lịch".
    *   `[ ]` **(Đề xuất) Cập nhật trạng thái vận hành của chuyến hàng:**
        *   Dựa trên thông tin cập nhật từ tài xế hoặc các nguồn khác (ví dụ: định vị GPS nếu có), Giao nhận cập nhật trạng thái thực tế của chuyến hàng trong hệ thống. Ví dụ:
            *   Xác nhận xe đã đến điểm lấy hàng.
            *   Xác nhận xe đã bắt đầu di chuyển.
            *   Ghi nhận xe đã đến điểm trả hàng.
            *   Cập nhật khi có sự cố hoặc chậm trễ.
    *   `[ ]` **(Đề xuất) Ghi nhận các sự cố hoặc ghi chú quan trọng:**
        *   Ghi chú lại các thông tin quan trọng hoặc sự cố phát sinh trong quá trình vận chuyển (ví dụ: thay đổi thời gian giao hàng do thời tiết, vấn đề về chứng từ, hư hỏng nhỏ cần báo cáo) vào phần ghi chú của chuyến đi.
    *   `[ ]` **Phối hợp phân công vận chuyển:**
        *   Xem các kế hoạch vận chuyển chưa được Quản lý phân công xe hoặc tài xế.
        *   (Đề xuất) Đề xuất hoặc trực tiếp thực hiện việc ghép xe/tài xế phù hợp cho các chuyến đi (quyền hạn này cần được Quản lý xác định).
    *   `[ ]` **Truy cập nhanh thông tin liên hệ hỗ trợ:**
        *   Dễ dàng xem thông tin liên hệ của Khách hàng, Đối tác (nhà xe phụ), và Tài xế liên quan trực tiếp đến một chuyến hàng cụ thể để tiện liên lạc và điều phối.
    *   `[ ]` **(Đề xuất) Theo dõi vị trí xe (nếu hệ thống tích hợp GPS):**
        *   Nếu có tích hợp, xem vị trí hiện tại của xe trên bản đồ để chủ động hơn trong việc theo dõi và thông báo cho các bên liên quan.

### 2. Epic: Hỗ trợ Quản lý Chứng từ và Hoàn tất Chuyến đi

*   **Mục tiêu:** Đảm bảo các chứng từ liên quan đến chuyến đi được chuẩn bị và kiểm tra (ở mức độ cơ bản), hỗ trợ Kế toán hoàn tất các thủ tục.

*   **User Stories:**
    *   `[ ]` **(Đề xuất) Kiểm tra thông tin cơ bản trước chuyến đi:**
        *   Đối chiếu thông tin trên lệnh vận chuyển với thông tin trên hệ thống (ví dụ: số xe, số container, tên khách hàng, địa điểm).
    *   `[ ]` **(Đề xuất) Nhận và chuyển thông tin/chứng từ đơn giản:**
        *   Tiếp nhận các thông tin hoặc hình ảnh chứng từ đơn giản từ tài xế (ví dụ: ảnh phiếu cân, biên bản giao nhận có chữ ký) và chuyển cho bộ phận Kế toán hoặc Quản lý khi cần.
    *   `[ ]` **Thông báo cho Kế toán khi chuyến đi hoàn tất:**
        *   Sau khi xác nhận từ tài xế hoặc các nguồn tin cậy rằng chuyến đi đã hoàn thành (hàng đã hạ, container đã trả nếu có), thông báo hoặc cập nhật trạng thái (nếu được phép) để Kế toán có thể tiến hành các bước tiếp theo.

---

## IV. Vai trò: Lái xe (Driver)

Tài xế là người trực tiếp thực hiện các chuyến vận chuyển, đảm bảo hàng hóa được giao nhận an toàn và đúng hẹn. Giao diện cho tài xế thường được thiết kế đơn giản, dễ sử dụng, tập trung vào thông tin chuyến đi và cập nhật trạng thái.

*(Lưu ý: Các chức năng dưới đây được đề xuất dựa trên nhu cầu thông thường của Tài xế trong một hệ thống quản lý vận tải hiện đại và có thể yêu cầu phát triển giao diện riêng (ví dụ: ứng dụng di động hoặc trang web tối ưu cho di động). Cần xác nhận lại với kế hoạch phát triển tính năng của hệ thống NePO.)*

### 1. Epic: Quản lý Chuyến đi và Cập nhật Tiến độ

*   **Mục tiêu:** Giúp tài xế nắm rõ thông tin về các chuyến đi được phân công và dễ dàng cập nhật tiến độ công việc cho bộ phận điều hành.

*   **User Stories:**
    *   `[ ]` **(Đề xuất) Đăng nhập vào hệ thống bằng tài khoản được cấp:**
        *   Truy cập vào giao diện dành cho tài xế bằng tên đăng nhập và mật khẩu.
    *   `[ ]` **(Đề xuất) Xem danh sách các chuyến đi được phân công:**
        *   Hiển thị danh sách các chuyến đi được giao cho tài xế, sắp xếp theo ngày hoặc mức độ ưu tiên.
        *   Thông tin tóm tắt cho mỗi chuyến: mã chuyến, ngày, điểm đi, điểm đến chính, trạng thái.
    *   `[ ]` **(Đề xuất) Xem thông tin chi tiết của một chuyến đi:**
        *   Khi chọn một chuyến đi, hiển thị đầy đủ thông tin:
            *   Địa chỉ cụ thể của điểm đi và các điểm đến (có thể tích hợp chỉ đường trên bản đồ).
            *   Thời gian dự kiến cho mỗi điểm.
            *   Thông tin hàng hóa: tên hàng, số lượng (nếu có), yêu cầu đặc biệt (nếu có).
            *   Thông tin container: số container, số seal.
            *   Thông tin liên hệ của người phụ trách ở điểm đi/đến (nếu có).
            *   Các ghi chú hoặc hướng dẫn khác từ điều độ viên.
    *   `[ ]` **(Đề xuất) Cập nhật trạng thái thực tế của chuyến đi:**
        *   Cung cấp các nút hoặc lựa chọn đơn giản để tài xế cập nhật nhanh trạng thái, ví dụ:
            *   "Đã nhận lệnh / Sẵn sàng": Xác nhận đã nhận thông tin chuyến đi.
            *   "Đến điểm lấy hàng": Thông báo đã tới vị trí bốc hàng.
            *   "Đang xếp hàng": Thông báo đang trong quá trình xếp hàng.
            *   "Đã lấy hàng / Bắt đầu vận chuyển": Thông báo đã nhận hàng và xe bắt đầu di chuyển.
            *   "Đến điểm trả hàng": Thông báo đã tới vị trí giao hàng.
            *   "Đang dỡ hàng": Thông báo đang trong quá trình dỡ hàng.
            *   "Hoàn thành chuyến đi": Xác nhận đã giao hàng xong và kết thúc chuyến.
            *   "Gặp sự cố": Báo cáo sự cố (ví dụ: xe hỏng, tai nạn, tắc đường nghiêm trọng).
    *   `[ ]` **(Đề xuất) Xác nhận thông tin container và seal:**
        *   Có trường để nhập hoặc xác nhận lại số container và số seal khi nhận hàng và giao hàng, đảm bảo tính chính xác.
    *   `[ ]` **(Đề xuất) Nhận thông báo và chỉ dẫn từ Điều độ/Giao nhận:**
        *   Hiển thị các thông báo mới hoặc thay đổi về lịch trình, yêu cầu từ bộ phận điều hành.

### 2. Epic: Ghi nhận Chi phí Phát sinh và Thông tin Liên quan (Đề xuất)

*   **Mục tiêu:** Cho phép tài xế ghi nhận một số chi phí phát sinh trên đường hoặc các thông tin cần thiết khác một cách thuận tiện.

*   **User Stories:**
    *   `[ ]` **(Đề xuất) Giao diện nhập chi phí đơn giản:**
        *   Cho phép nhập các khoản chi phí nhỏ phát sinh trên đường mà tài xế đã chi trả bằng tiền mặt (ví dụ: tiền xăng dầu lẻ tự đổ, phí cầu đường không qua Epass, phí vá vỏ, tiền bồi dưỡng bốc xếp nếu có).
        *   Các trường thông tin có thể bao gồm: loại chi phí, số tiền, ghi chú ngắn.
    *   `[ ]` **(Đề xuất) Chụp ảnh hóa đơn/biên lai:**
        *   Cho phép tài xế chụp ảnh hóa đơn, biên lai của các chi phí đã nhập và đính kèm vào ghi nhận chi phí đó.
    *   `[ ]` **(Đề xuất) Ghi nhận số km khi bắt đầu/kết thúc chuyến (nếu cần):**
        *   Nếu quy trình yêu cầu, tài xế có thể nhập số km công tơ mét của xe khi bắt đầu và kết thúc một chuyến đi hoặc một ngày làm việc.
    *   `[ ]` **(Đề xuất) Báo cáo các vấn đề về phương tiện:**
        *   Nếu phát hiện các vấn đề kỹ thuật hoặc hư hỏng nhẹ của xe trong quá trình vận hành, có thể gửi báo cáo nhanh cho bộ phận quản lý xe/sửa chữa.

---

#### UI Specification: Định mức dầu (Fuel Quota) Management

**1. Bảng Định mức dầu theo xe (Per-Vehicle Fuel Quota Table)**
- **Purpose:** Quản lý định mức dầu riêng cho từng xe đầu kéo.
- **Fields/Columns:**
    - STT (Index)
    - Biển số xe (Vehicle Plate Number)
    - Rơ-mooc (Trailer Plate Number)
    - Loại rơ-mooc (Trailer Type, e.g. 20', 40')
    - Định mức hàng (L/100km) (Cargo quota, e.g. 43)
    - Định mức vỏ (L/100km) (Empty quota, e.g. 39)
    - Động cơ (Engine type, optional)
    - Định mức bổ sung (Supplement, e.g. +3L/trip, manager-configurable, default 3)
- **Actions:**
    - Thêm/Sửa/Xóa xe và các định mức liên quan
    - Import/Export Excel (optional, for bulk update)

**2. Bảng Định mức dầu theo tuyến khoán (Fixed-Route Fuel Quota Table)**
- **Purpose:** Quản lý các tuyến đường đã khoán số lít dầu cụ thể, cho phép nhập trực tiếp số lít dầu cho từng tuyến.
- **Fields/Columns:**
    - STT (Index)
    - Tuyến đường vận chuyển (Route description)
    - Định mức dầu 40' (Lít)
    - Định mức dầu 20' (Lít)
    - Ghi chú (Notes, optional)
- **Actions:**
    - Thêm/Sửa/Xóa tuyến khoán và định mức
    - Import/Export Excel (optional)

**3. Cấu hình bổ sung (Supplemental Quota Config)**
- **Purpose:** Cho phép quản lý cài đặt giá trị bổ sung (Lít/trip) áp dụng cho tất cả các xe (default 3L, editable).
- **Field:**
    - Định mức bổ sung mặc định (Default supplement, number input)
- **Action:**
    - Lưu cấu hình

**4. Lưu ý về nhập liệu:**
- Khi nhập liệu kế hoạch vận chuyển, nếu tuyến thuộc danh sách khoán thì kế toán có thể nhập trực tiếp số lít dầu. Nếu không, phần mềm sẽ tự động tính theo công thức: Số lít dầu = Số km hàng * Định mức hàng + Số km vỏ * Định mức vỏ + bổ sung.

---


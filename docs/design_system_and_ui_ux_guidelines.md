# BHCMS UI/UX Design System & Implementation Guidelines

Tài liệu này tổng hợp toàn bộ các triết lý thiết kế, quy chuẩn UI/UX, hệ thống component nền tảng và các mẫu bố cục (Layout Patterns) đã được đúc kết và tối ưu trong quá trình xây dựng hệ thống quản lý chuỗi nhà trọ BHCMS. 

Tài liệu này được biên soạn chi tiết dưới dạng Markdown để có thể đưa trực tiếp vào Claude/ChatGPT làm ngữ cảnh (Context) hoặc System Prompt hỗ trợ phát triển Frontend.

---

## 1. Triết lý Thiết kế & Nguyên tắc Visual (Design Philosophy)

Hệ thống BHCMS hướng tới một giao diện quản trị chuyên nghiệp, hiện đại, tối giản nhưng cao cấp (Premium Slate & Indigo). Giao diện tập trung vào tính rõ ràng của dữ liệu, giảm thiểu sự tải màu sắc dư thừa (cognitive load) và tăng tốc độ thao tác.

### Hệ thống Typography (Font Pairing)
*   **Body Text:** Sử dụng `Inter` (Sans-serif) làm font mặc định cho toàn bộ nội dung, nhãn, bảng biểu để đảm bảo tính dễ đọc tuyệt đối trên mọi độ phân giải màn hình.
*   **Headings (h1, h2, h3...):** Sử dụng `Outfit` làm font tiêu đề tạo cảm giác hiện đại, vững chãi.
*   **Special Titles / Brand Emphasis:** Sử dụng `Unbounded` (Font Geometric) cho các phần tiêu đề lớn của trang Auth, tiêu đề Modal nổi bật để tạo điểm nhấn thị giác cao cấp.
*   **Import:**
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&family=Unbounded:wght@600;700&display=swap');
    ```

### Bảng màu Chủ đạo (Color Palette)
*   **Primary (Chủ đạo):** `#3525CD` (Indigo tinh tế) - Được sử dụng cho các hành động chính (Primary Action), trạng thái tiêu điểm (Focus States), các link hoặc nhãn quan trọng.
*   **Primary Hover:** `#1E00A9` (Indigo đậm màu hơn khi hover).
*   **Base Neutral Background:** `#F8FAFC` (Xám trắng dịu mắt, tránh mỏi mắt khi sử dụng thời gian dài).
*   **Text Color (Primary):** `#131B2E` (Navy đen sâu, độ tương phản cao nhưng dễ chịu hơn màu đen tuyệt đối).
*   **Text Color (Secondary):** `#464555` (Màu xám sẫm để làm nhãn phụ, mô tả, text cấp 2).
*   **Border Color:** `#C7C4D8` (Màu viền xám tím nhạt, định hình khung và lưới rõ ràng).
*   **Focus Ring Outline:** Sử dụng vòng xanh `#3525CD` cùng offset trắng để hỗ trợ khả năng truy cập (Accessibility).

### Đường nét & Bố cục Phẳng (Flat Design with Subtle Depth)
*   **Bán kính bo góc (Border Radius):** Đồng nhất sử dụng bo góc lớn `rounded-xl` (12px) cho Cards, Modals, và `rounded-lg` (8px) cho Buttons, Form Inputs để tạo cảm giác mềm mại thân thiện.
*   **Độ đổ bóng (Shadows):** Hạn chế đổ bóng đậm. Sử dụng đổ bóng cực nhẹ `shadow-[0_1px_2px_rgba(15,23,42,0.05)]` để phân tách lớp hoặc không dùng shadow cho phong cách Flat sạch sẽ. Viền (`border-[#C7C4D8]`) đóng vai trò chính để phân tách không gian thay vì bóng đổ.

---

## 2. 4 Mô hình Bố cục Form Quản lý (Form Layout Alternatives)

Để giải phóng không gian hiển thị cho bảng danh sách dữ liệu (Table chiếm 100% chiều ngang trang), chúng ta loại bỏ hoàn toàn dạng chia đôi cột truyền thống (Form bên trái, Table bên phải) và thay thế bằng 4 phương án sau tùy theo độ phức tạp của form:

### LỰA CHỌN 1: Centered Modal Dialog (Hộp thoại Modal căn giữa - Khuyên dùng)
> [!TIP]
> **Phù hợp nhất cho:** Các form có quy mô dữ liệu vừa và nhỏ (như Tiện ích, Loại phòng, Mẫu thông báo, Dịch vụ). Bố cục này tập trung sự chú ý tuyệt đối của người dùng vào giữa màn hình.

*   **Bố cục trang chính:** Bảng danh sách chiếm 100% chiều ngang. Nút "Thêm mới" nằm trên PageHeader của trang.
*   **Cấu trúc Modal:**
    *   **Nền che (Overlay):** Phải có hiệu ứng làm mờ nền nhẹ (`backdrop-blur-sm bg-slate-900/50`) để người dùng không bị phân tâm bởi dữ liệu bảng phía dưới.
    *   **Khung chứa Form (Modal Card):** Bo góc lớn (`rounded-xl`), có nút Close (X) ở góc phải trên.
    *   **Phân chia 3 vùng rõ rệt:**
        1.  *Modal Header:* Tiêu đề rõ ràng ("Thêm mới tiện ích" / "Cập nhật tiện ích").
        2.  *Modal Body:* Chứa form nhập liệu, hỗ trợ cuộn dọc độc lập (`max-h-[75vh] overflow-y-auto`) để tránh form bị tràn ra ngoài màn hình trên các thiết bị thấp.
        3.  *Modal Footer:* Đặt ở dưới cùng cố định, chứa nút "Hủy" (SecondaryButton) và nút "Lưu" (PrimaryButton) có icon đính kèm.

### LỰA CHỌN 2: Slide-over Drawer (Ngăn kéo trượt từ bên phải)
> [!NOTE]
> **Phù hợp nhất cho:** Các form có rất nhiều trường thông tin phức tạp, cần chia nhóm Tab hoặc nhiều bước nhập liệu (ví dụ: Tạo hợp đồng chi tiết, Khởi tạo thông tin chi tiết phòng trọ).

*   **Cơ chế hoạt động:** Khi người dùng bấm nút hành động, ngăn kéo sẽ trượt từ lề phải màn hình ra, chiếm từ 30% đến 40% chiều rộng màn hình.
*   **Ưu điểm:** Tận dụng được tối đa chiều cao màn hình, cho phép hiển thị form dài mà không tạo cảm giác chật chội. Đồng thời người dùng vẫn nhìn thấy một phần dữ liệu ở bảng bên trái.
*   **Cấu trúc Drawer:**
    *   Nền che phủ mờ bên trái.
    *   Drawer Panel chạy từ đỉnh đến đáy màn hình (`h-full w-full max-w-md bg-white border-l border-slate-200 animate-slide-in`).

### LỰA CHỌN 3: Expandable Top Panel (Khung mở rộng phía trên bảng)
> [!NOTE]
> **Phù hợp nhất cho:** Các tác vụ thêm nhanh mà người dùng cần tham chiếu liên tục với danh sách bảng bên dưới mà không muốn bị che khuất bởi Overlay (ví dụ: bộ lọc nâng cao, thêm nhanh phòng).

*   **Cơ chế:** Khi click nút "Thêm mới", một khung Card chứa Form sẽ trượt xuống từ phía dưới Page Header và nằm ngay trên Table (đẩy Table xuống dưới).
*   **Trải nghiệm người dùng:** Rất mượt mà, không gián đoạn luồng làm việc. Nên tích hợp các hiệu ứng CSS transition mượt để tránh giật giao diện.

### LỰA CHỌN 4: Inline Table Row Editing (Chỉnh sửa trực tiếp trên dòng)
> [!NOTE]
> **Phù hợp nhất cho:** Bảng cực kỳ đơn giản, chỉ có 1 đến 2 trường dữ liệu văn bản ngắn (ví dụ: Quản lý danh mục thẻ, Tên loại trạng thái đơn giản).

*   **Cơ chế:** Không có form rời. Khi người dùng bấm nút "Sửa" ở cột hành động, các ô dữ liệu dạng chữ (`<span>`) của dòng đó sẽ chuyển ngay thành các ô nhập liệu (`<input className="w-full rounded border-slate-200 px-2 py-1 text-sm">`). Nút "Sửa" chuyển thành "Lưu", nút "Xóa" chuyển thành "Hủy".

---

## 3. Hệ thống Component Giao diện (Core Design System Components)

Toàn bộ giao diện được lắp ghép từ các component nguyên tử trong file [DesignSystem.jsx](file:///d:/D%E1%BB%B1%20%C3%A1n%20SWP391/frontend/src/components/ui/DesignSystem.jsx). Dưới đây là mã nguồn chuẩn hóa của các component để tái sử dụng:

### 3.1. Các Component Nền tảng (Layout Shells & Cards)

```jsx
// Utility kết hợp class Tailwind
function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Khung bao ngoài của một Card
export function Card({ children, className = '', ...rest }) {
  return (
    <div className={cx('rounded-xl border border-[#C7C4D8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]', className)} {...rest}>
      {children}
    </div>
  );
}

// Khung vỏ bọc toàn trang quản lý
export function PageShell({ children, className = '' }) {
  return <div className={cx('bg-[#F8FAFC] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 flex-1 flex flex-col', className)}>{children}</div>;
}

// Tiêu đề trang chuẩn hóa
export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-[#3525CD]">{eyebrow}</p>}
        <h1 className="mt-2 font-unbounded text-xl font-bold tracking-tight text-slate-950 lg:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-xs leading-5 text-[#464555]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
```

### 3.2. Hệ thống Nút nhấn (Buttons)

Hệ thống nút được thiết kế đồng bộ với chiều cao tiêu chuẩn là `h-[42px]` cho form và `h-8` cho table action.

```jsx
// Nút hành động chính (Primary)
export function PrimaryButton({ children, className = '', type = 'button', to, ...props }) {
  const buttonClass = cx(
    'inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#3525CD] px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#1E00A9] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    className
  );
  if (to) return <Link to={to} className={buttonClass}>{children}</Link>;
  return <button type={type} className={buttonClass} {...props}>{children}</button>;
}

// Nút hành động phụ (Secondary)
export function SecondaryButton({ children, className = '', type = 'button', to, ...props }) {
  const buttonClass = cx(
    'inline-flex h-[42px] items-center justify-center gap-2 rounded-lg border border-[#C7C4D8] bg-white px-4 text-sm font-semibold text-[#131B2E] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[#777587] hover:bg-[#F2F3FF] hover:text-[#1E00A9] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    className
  );
  if (to) return <Link to={to} className={buttonClass}>{children}</Link>;
  return <button type={type} className={buttonClass} {...props}>{children}</button>;
}

// Nút cảnh báo nguy hiểm (Xóa, Hủy hợp đồng...)
export function DangerButton({ children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-[42px] items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Nút thao tác trên dòng bảng (Table Action)
export function TableAction({ children, className = '', icon, type = 'button', to, tone = 'neutral', ...props }) {
  const actionIcon = icon || inferActionIcon(children);
  const toneClass = tone === 'danger'
    ? 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-100 hover:border-rose-100'
    : tone === 'primary'
    ? 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-[#3525CD] border border-slate-100 hover:border-indigo-100'
    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950 border border-slate-100 hover:border-slate-200';
    
  const actionClass = cx(
    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2',
    toneClass,
    className
  );
  
  const content = (
    <>
      {actionIcon && <MaterialIcon name={actionIcon} className="text-[16px]" />}
      {children}
    </>
  );
  
  if (to) return <Link to={to} className={actionClass}>{content}</Link>;
  return <button type={type} className={actionClass} {...props}>{content}</button>;
}
```

### 3.3. Các trường nhập liệu (Form Inputs)

Nhãn (Label) của form được tự động in hoa nhỏ (`text-xs font-semibold uppercase tracking-wider text-[#464555]`) để tạo sự gọn gàng và tách biệt rõ rệt với nội dung nhập liệu.

```jsx
// Trường nhập văn bản (Text / Number / Email / Password)
export function TextInput({ label, className = '', inputClassName = '', id, name, disabled, readOnly, value, onChange, ...props }) {
  const inputId = id || name;
  return (
    <label htmlFor={inputId} className={cx('block font-inter', className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#464555]">{label}</span>}
      <input
        id={inputId}
        name={name}
        disabled={disabled}
        readOnly={readOnly || (disabled && onChange === undefined)}
        value={value}
        onChange={onChange}
        {...props}
        className={cx(
          'h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD] focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-slate-400',
          inputClassName
        )}
      />
    </label>
  );
}

// Trường chọn (Select Dropdown)
export function SelectInput({ label, className = '', inputClassName = '', id, name, children, ...props }) {
  const inputId = id || name;
  return (
    <label htmlFor={inputId} className={cx('block font-inter', className)}>
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#464555]">{label}</span>}
      <select
        id={inputId}
        name={name}
        {...props}
        className={cx(
          'h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-medium text-[#131B2E] outline-none transition hover:border-[#777587] focus-visible:border-[#3525CD] focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2',
          inputClassName
        )}
      >
        {children}
      </select>
    </label>
  );
}
```

### 3.4. Chỉ báo & Hộp thoại xác nhận (Badges, Alerts, Modals)

```jsx
// Biểu tượng Material Icon chuẩn
export function MaterialIcon({ name, className = '' }) {
  return <span className={cx('material-symbols-outlined select-none', className)} aria-hidden="true">{name}</span>;
}

// Trạng thái chuẩn hóa có màu sắc phản hồi (Feedback Colors)
export function StatusBadge({ status, labels }) {
  // labels là object map key dạng: { AVAILABLE: 'Trống', OCCUPIED: 'Đã thuê'... }
  const displayLabel = labels?.[status] || status;
  
  if (status === 'AVAILABLE' || status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 backdrop-blur-[4px] ring-1 ring-emerald-500/20">
        {displayLabel}
      </span>
    );
  }

  const classes = {
    OCCUPIED: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
    MAINTENANCE: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-600 ring-slate-500/20',
    SUSPENDED: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
  };

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', classes[status] || 'bg-slate-500/10 text-slate-700 ring-slate-500/20')}>
      {displayLabel}
    </span>
  );
}

// Hộp thoại Xác nhận Hành động Nguy hiểm (Confirm Modal)
export function ConfirmModal({ open, title = 'Confirm action', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', loading = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  const confirmClass = tone === 'danger'
    ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300'
    : 'bg-[#3525CD] text-white hover:bg-[#1E00A9] focus-visible:ring-[#3525CD]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <span className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            tone === 'danger' ? 'bg-rose-500/10 text-rose-600' : 'bg-[#3525CD]/10 text-[#3525CD]',
          )}>
            <MaterialIcon name={tone === 'danger' ? 'warning' : 'help'} className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-modal-title" className="font-unbounded text-base font-bold text-slate-950">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3525CD] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cx('inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60', confirmClass)}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Các UX Patterns Phức tạp & Kinh nghiệm Đúc kết (Critical UX Workarounds)

Trong quá trình phát triển UI/UX cho hệ thống BHCMS, chúng ta đã phát hiện và xử lý nhiều vấn đề thực tế quan trọng sau:

### 4.1. Đồng bộ hóa Tab với URL (Tab-State URL Synchronization)
> [!IMPORTANT]
> **Vấn đề:** Khi một trang quản trị sử dụng giao diện Tab (ví dụ: Trang chi tiết vận hành phòng có tab Overview, Utility, Occupants, Invoices), nếu người dùng click từ tab Occupants sang trang con "Sửa Roommate" hoặc "Thêm mới hợp đồng", sau đó nhấn nút "Back" trên trình duyệt hoặc nút "Hủy" trên form con, họ sẽ bị chuyển hướng quay lại Tab mặc định thứ nhất (Overview) thay vì Tab họ đang thao tác trước đó. Điều này gây ức chế cực kỳ lớn cho người dùng.

*   **Giải pháp:** Đồng bộ hóa tab đang kích hoạt lên URL Query Parameters (ví dụ: `?tab=occupants`) bằng React Router `useSearchParams`. Khi người dùng quay lại trang, đọc tab từ URL làm state khởi tạo.
*   **Mẫu triển khai:**
    ```javascript
    import { useEffect, useState } from 'react';
    import { useSearchParams } from 'react-router-dom';

    export default function RoomDetailPage() {
      const [searchParams, setSearchParams] = useSearchParams();
      
      // Đọc giá trị tab từ URL lúc khởi tạo, fallback là tab mặc định 'overview'
      const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview');

      // Đồng bộ state tab ngược lại URL khi có thay đổi
      useEffect(() => {
        const currentTabInUrl = searchParams.get('tab');
        if (activeTab !== currentTabInUrl) {
          setSearchParams(
            (prev) => {
              prev.set('tab', activeTab);
              return prev;
            },
            { replace: true } // replace: true để tránh làm rác lịch sử back/forward của trình duyệt
          );
        }
      }, [activeTab, searchParams, setSearchParams]);

      return (
        <div>
          {/* Các nút chuyển Tab */}
          <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''}>Overview</button>
          <button onClick={() => setActiveTab('occupants')} className={activeTab === 'occupants' ? 'active' : ''}>Occupants</button>
          
          {/* Nút điều hướng đi trang con phải truyền kèm theo state tab cũ trong URL Back */}
          <Link to={`/rooms/1/edit-occupant?roomId=1&backTab=occupants`}>Chỉnh sửa</Link>
        </div>
      );
    }
    ```

### 4.2. Tránh Batching State Lỗi Khi Xử Lý Tự Động (Stale State / Batching Bug)
> [!IMPORTANT]
> **Vấn đề:** Khi tích hợp chức năng quét QR Code trên Căn cước công dân (CCCD) để tự động điền (Auto-fill) các trường dữ liệu như Họ tên, Ngày sinh, Số CCCD. Nếu đếm số trường dữ liệu được tự động điền thành công ngay trong callback `setFormData` để cập nhật thông báo (ví dụ: *"Đã tự động điền 5 trường"*), do cơ chế batching state của React, giá trị đếm sẽ luôn nhận giá trị cũ/bằng 0 (stale state).

*   **Giải pháp:** Tính toán trước toàn bộ danh sách trường được điền vào một biến cục bộ riêng (`const filled = new Set()`), sau đó cập nhật song song cả Form Data lẫn State thông báo mà không phụ thuộc lẫn nhau.
*   **Mẫu triển khai sai:**
    ```javascript
    const filled = new Set();
    setFormData((current) => {
      const next = { ...current };
      if (parsed.fullName) { next.fullName = parsed.fullName; filled.add('fullName'); }
      return next;
    });
    // LỖI: filled.size lúc này vẫn là 0 vì React chưa re-render xong callback setFormData!
    setCccdMessage(`Extracted ${filled.size} fields...`); 
    ```
*   **Mẫu triển khai đúng (Đã đúc kết):**
    ```javascript
    const filled = new Set();
    if (parsed.fullName) filled.add('fullName');
    if (parsed.identityNo) filled.add('identityNo');
    
    // Thực hiện ghi nhận data
    setFormData((current) => {
      const next = { ...current };
      if (parsed.fullName) next.fullName = parsed.fullName;
      if (parsed.identityNo) next.identityNo = parsed.identityNo;
      return next;
    });
    
    // Ghi nhận state thông báo độc lập hoàn toàn
    setAutoFilledFields(filled);
    setCccdMessage(`Extracted ${filled.size} fields from ID card.`);
    ```

### 4.3. Quy Tắc Bảo Toàn Nghiệp Vụ Khi Refactor UI (Business Logic Conservation Rules)
Khi thực hiện tái cấu trúc giao diện (Refactor UI) từ các mã nguồn cũ hoặc khi dùng các AI model khác như Claude hỗ trợ code:
1.  **Tuyệt đối không thay đổi logic state nghiệp vụ:** Giữ nguyên toàn bộ các hàm xử lý logic nền bên dưới như `submit`, `load`, `remove`, `toggleStatus`, các lời gọi API Services. Chỉ chỉnh sửa phần bao bọc hiển thị bên ngoài (JSX/HTML/CSS).
2.  **Bảo vệ các khóa dịch đa ngôn ngữ (i18n Keys):** Giao diện sản phẩm hỗ trợ đa ngôn ngữ. Tuyệt đối không thay thế các khóa dịch `t('common.actions.edit')` bằng chữ viết cứng (hardcoded text) tiếng Việt hoặc tiếng Anh trong quá trình làm đẹp UI.
3.  **Tương thích Thiết bị Di động (Responsive Ready):** Mọi Modal hay Slide-over Drawer khi hiển thị trên Mobile phải tự động giãn chiều ngang `w-full` và điều chỉnh lại padding để vừa khít màn hình điện thoại, đồng thời kích hoạt thuộc tính cuộn dọc nội dung của riêng Modal đó (`overflow-y-auto`).

---

## 5. Hướng dẫn Tích hợp dành cho Claude (Claude Integration Guide)

Khi cung cấp tài liệu này cho Claude để yêu cầu viết code hoặc sửa UI, hãy đính kèm chỉ dẫn sau:

```markdown
"Bạn hãy đóng vai trò là Senior Frontend Developer xây dựng UI dựa trên các nguyên tắc thiết kế sau:
1. Chỉ sử dụng Tailwind CSS kết hợp với các component nguyên tử được định nghĩa trong file DesignSystem.jsx.
2. Các form quản lý vừa và nhỏ phải được đưa về Centered Modal Dialog hoặc Slide-over Drawer tùy theo độ phức tạp để giải phóng Table hiển thị 100% bề ngang.
3. Khi viết code, luôn đảm bảo giữ nguyên business logic cũ, giữ nguyên i18n translation keys và đồng bộ các tab giao diện với URL query params (?tab=...) sử dụng React Router useSearchParams."
```

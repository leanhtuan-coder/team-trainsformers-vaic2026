# Tóm tắt mô hình chi phí — La Bàn Nghề

> Chi tiết đầy đủ (công thức, có thể chỉnh giả định) nằm trong file Excel
> `LaBanNghe_ChiPhiHaTang_ChienLuocGia.xlsx` do BA (Ngọc) quản lý. File này chỉ tóm tắt để Claude
> Code tham khảo khi quyết định chọn model cho từng bước.

## Chi phí LLM ước tính mỗi phiên hoàn chỉnh
| Phương án | Model dùng cho bước Matching & giải thích | Chi phí/phiên |
|---|---|---|
| A — Tiết kiệm | GPT-4o mini | ~102 đ (~$0.004) |
| B — Chất lượng cao (khuyến nghị) | GPT-4o | ~513 đ (~$0.02) |

**Khuyến nghị:** dùng GPT-4o mini cho toàn bộ trừ bước "Matching & sinh giải thích" — bước này nên
dùng GPT-4o vì quyết định chất lượng lý luận/giải thích, tiêu chí BTC chấm điểm cao. Chênh lệch chi
phí tuyệt đối rất nhỏ (<500đ/phiên).

## Chi phí hạ tầng theo quy mô (ước tính)
| Quy mô (MAU) | Tổng chi phí/tháng | Chi phí/user/tháng |
|---|---|---|
| 100 (pilot) | ~$28 | ~7,000 đ |
| 1,000 | ~$91 | ~2,270 đ |
| 10,000 | ~$473 | ~1,180 đ |
| 100,000 | ~$3,668 | ~920 đ |

Chi phí/user giảm mạnh theo quy mô vì hosting phần lớn là chi phí cố định, LLM chỉ là biến phí nhỏ.

## Ý nghĩa cho việc code trong 48h
- Không cần lo ngại chi phí LLM khi thiết kế vòng lặp Profiling (10 lượt hỏi-đáp) — chi phí không
  đáng kể ngay cả ở model rẻ nhất.
- Ưu tiên chất lượng cho bước Matching & giải thích (dùng model mạnh hơn) vì đây là bước quyết định
  điểm số, không phải bước tốn kém nhất.
- Không cần tối ưu triệt để chi phí trong bản demo 48h — ưu tiên đúng luật, đúng kiến trúc, và chất
  lượng giải thích/chống thiên vị hơn là tiết kiệm vài trăm đồng mỗi phiên.

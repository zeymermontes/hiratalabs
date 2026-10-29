import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/modules/orders/status";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ORDER_STATUS_TONE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

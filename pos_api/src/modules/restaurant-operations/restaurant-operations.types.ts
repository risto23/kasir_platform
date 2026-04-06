import type {
  OrderItemStatus,
  OrderStatus,
  OutletTableStatus,
  PaymentStatus,
} from '@prisma/client';

export type TableQrResponse = {
  outlet: {
    id: string;
    name: string;
    code: string;
  };
  table: {
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    status: OutletTableStatus;
  };
  token: string;
  guestMenuUrl: string;
  qrValue: string;
};

export type TableMonitorStatus =
  | 'AVAILABLE'
  | 'WAITING_KITCHEN'
  | 'PROCESSING'
  | 'READY_TO_SERVE'
  | 'SERVED'
  | 'WAITING_PAYMENT';

export type TableMonitorItemSummary = {
  pending: number;
  processing: number;
  done: number;
  served: number;
  cancelled: number;
};

export type TableMonitorItem = {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  tableStatus: OutletTableStatus;
  monitorStatus: TableMonitorStatus;
  activeOrder: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    notes: string | null;
    createdAt: string;
    submittedAt: string | null;
    totalAmount: number;
    totalItems: number;
    itemSummary: TableMonitorItemSummary;
  } | null;
};

export type OutletTableMonitorResponse = {
  outlet: {
    id: string;
    name: string;
    code: string;
  };
  summary: {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    waitingPaymentTables: number;
    readyTables: number;
  };
  items: TableMonitorItem[];
};

export type ActiveOrderItemMonitor = {
  status: OrderItemStatus;
  quantity: number;
};

export type ActiveOrderMonitor = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  totalAmount: number;
  items: ActiveOrderItemMonitor[];
};
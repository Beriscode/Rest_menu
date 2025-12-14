
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  CUSTOMER = 'CUSTOMER'
}

export enum OrderStatus {
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  PENDING_CLEANING = 'PENDING_CLEANING'
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TELEBIRR';

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

export interface MenuItemOption {
  name: string;
  priceModifier: number;
}

export interface Review {
  id: string;
  itemId: string;
  itemName: string;
  customerName: string;
  rating: number; 
  comment: string;
  timestamp: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  options?: MenuItemOption[];
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
}

export interface Table {
  id: string;
  number: string;
  x: number; 
  y: number; 
  capacity: number;
  status: TableStatus;
  shape: 'SQUARE' | 'CIRCLE' | 'RECTANGLE';
  assignedStaffId?: string;
  assignedStaffName?: string;
}

export interface CartItem extends MenuItem {
  cartId: string; 
  selectedOptions: MenuItemOption[];
  quantity: number;
  notes?: string;
  groupId?: string; 
  groupName?: string; 
}

export interface Order {
  id: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  guestAvatar?: string;
  guestColor?: string;
  items: CartItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  timestamp: number;
  createdBy: Role;
  paymentMethod?: PaymentMethod;
}

export interface CartGroup {
  name: string;
  items: CartItem[];
  total: number;
}

export interface Notification {
  id: string;
  targetStaffId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

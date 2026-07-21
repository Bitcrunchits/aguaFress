import { OrderJobStatus } from '../enums';
import type {
  AsyncAcceptedResponse,
  CreateOrderJobData,
  OrderJobStatusResponse,
} from '../dto/orders.dto';

const acceptedResponseCheck: AsyncAcceptedResponse = {
  jobId: 'orders.create:cliente-1:key-1',
  trackingId: 'tracking-1',
  vendedorId: 'vendedor-1',
  status: OrderJobStatus.PENDING,
  statusUrl: '/api/v1/orders/job-status?id=tracking-1',
  acceptedAt: '2026-07-17T00:00:00.000Z',
};

const statusResponseCheck: OrderJobStatusResponse = {
  jobId: acceptedResponseCheck.jobId,
  trackingId: acceptedResponseCheck.trackingId,
  clienteId: 'cliente-1',
  idempotencyKey: 'key-1',
  status: OrderJobStatus.COMPLETED,
  orderId: 'order-1',
  attempts: 1,
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:01:00.000Z',
};

const failedStatusResponseCheck: OrderJobStatusResponse = {
  jobId: 'orders.create:cliente-1:key-2',
  trackingId: 'tracking-2',
  clienteId: 'cliente-1',
  idempotencyKey: 'key-2',
  status: OrderJobStatus.FAILED,
  errorCode: 'PRODUCT_UNAVAILABLE',
  errorMessage: 'Product data is temporarily unavailable',
  attempts: 3,
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:03:00.000Z',
};

const createJobDataCheck: CreateOrderJobData = {
  jobId: acceptedResponseCheck.jobId,
  trackingId: acceptedResponseCheck.trackingId,
  clienteId: statusResponseCheck.clienteId,
  vendedorId: 'vendedor-1',
  idempotencyKey: statusResponseCheck.idempotencyKey,
  requestId: 'request-1',
  body: { metodoPago: 'contra_entrega' },
  requestedAt: acceptedResponseCheck.acceptedAt,
};

void acceptedResponseCheck;
void statusResponseCheck;
void failedStatusResponseCheck;
void createJobDataCheck;

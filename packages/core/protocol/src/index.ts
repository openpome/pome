export interface RequestEnvelope<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: TPayload;
  readonly createdAt: string;
}

export interface ResponseEnvelope<TPayload = unknown> {
  readonly requestId: string;
  readonly ok: boolean;
  readonly payload?: TPayload;
  readonly error?: ProtocolError;
}

export interface ProtocolError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

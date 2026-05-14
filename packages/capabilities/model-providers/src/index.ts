export interface ModelRequest {
  readonly system?: string;
  readonly prompt: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface ModelResponse {
  readonly text: string;
  readonly providerId: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly displayName: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}

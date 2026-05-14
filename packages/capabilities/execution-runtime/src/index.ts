export interface CommandRequest {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ExecutionRuntime {
  readonly id: string;
  runCommand(request: CommandRequest): Promise<CommandResult>;
}

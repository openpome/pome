export type CommandHandler = (argv: readonly string[]) => Promise<boolean>;

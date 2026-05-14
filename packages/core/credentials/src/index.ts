import { spawnSync } from "node:child_process";
import { platform } from "node:os";

export interface CredentialStore {
  readonly backend: string;
  isAvailable(): boolean;
  get(account: string): Promise<string | undefined>;
  set(account: string, secret: string): Promise<void>;
  delete(account: string): Promise<void>;
}

export interface StoredSecret<TValue> {
  readonly value: TValue;
  readonly storedAt: string;
}

const serviceName = "openpome";

export function createCredentialStore(): CredentialStore {
  if (platform() === "darwin") {
    return new MacOSKeychainCredentialStore();
  }

  return new UnsupportedCredentialStore(platform());
}

export async function getJsonCredential<TValue>(store: CredentialStore, account: string): Promise<TValue | undefined> {
  const raw = await store.get(account);

  if (!raw) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as StoredSecret<TValue>;
  return parsed.value;
}

export async function setJsonCredential<TValue>(store: CredentialStore, account: string, value: TValue): Promise<void> {
  const payload: StoredSecret<TValue> = {
    value,
    storedAt: new Date().toISOString()
  };

  await store.set(account, JSON.stringify(payload));
}

class MacOSKeychainCredentialStore implements CredentialStore {
  readonly backend = "macos-keychain";

  isAvailable(): boolean {
    const result = spawnSync("/usr/bin/security", ["-h"], { encoding: "utf8" });
    return result.status === 0 || result.status === 1;
  }

  async get(account: string): Promise<string | undefined> {
    const result = spawnSync("/usr/bin/security", ["find-generic-password", "-s", serviceName, "-a", account, "-w"], {
      encoding: "utf8"
    });

    if (result.status === 44) {
      return undefined;
    }

    if (result.status !== 0) {
      throw new Error("Unable to read credential from macOS Keychain.");
    }

    return result.stdout.trim();
  }

  async set(account: string, secret: string): Promise<void> {
    const result = spawnSync(
      "/usr/bin/security",
      ["add-generic-password", "-U", "-s", serviceName, "-a", account, "-w", secret],
      { encoding: "utf8" }
    );

    if (result.status !== 0) {
      throw new Error("Unable to store credential in macOS Keychain.");
    }
  }

  async delete(account: string): Promise<void> {
    const result = spawnSync("/usr/bin/security", ["delete-generic-password", "-s", serviceName, "-a", account], {
      encoding: "utf8"
    });

    if (result.status !== 0 && result.status !== 44) {
      throw new Error("Unable to delete credential from macOS Keychain.");
    }
  }
}

class UnsupportedCredentialStore implements CredentialStore {
  readonly backend: string;

  constructor(platformName: string) {
    this.backend = `unsupported-${platformName}`;
  }

  isAvailable(): boolean {
    return false;
  }

  async get(): Promise<string | undefined> {
    return undefined;
  }

  async set(): Promise<void> {
    throw new Error("OS keychain storage is not implemented for this platform yet.");
  }

  async delete(): Promise<void> {
    throw new Error("OS keychain storage is not implemented for this platform yet.");
  }
}

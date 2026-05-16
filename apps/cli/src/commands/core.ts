import { getConfigPaths, initOpenPome, resetOpenPomeConfig, runDoctor, showOpenPomeConfig } from "@openpome/local-gateway";
import { printConfigPaths, printConfigReset, printConfigShow, printDoctorResult, printInitResult } from "../presentation.js";
import type { CommandHandler } from "./types.js";

export const handleCoreCommand: CommandHandler = async (argv) => {
  const [command] = argv;

  if (command === "init") {
    printInitResult(await initOpenPome());
    return true;
  }

  if (command === "doctor") {
    printDoctorResult(await runDoctor());
    return true;
  }

  if (command === "config" && argv[1] === "path") {
    printConfigPaths(await getConfigPaths());
    return true;
  }

  if (command === "config" && argv[1] === "show") {
    printConfigShow(await showOpenPomeConfig());
    return true;
  }

  if (command === "config" && argv[1] === "reset") {
    printConfigReset(await resetOpenPomeConfig());
    return true;
  }

  return false;
};

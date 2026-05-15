import { initOpenPome, runDoctor } from "@openpome/local-gateway";
import { printDoctorResult, printInitResult } from "../presentation.js";
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

  return false;
};

import { tool } from "ai";
import { z } from "zod";
import { VirtualFileSystem } from "../file-system";

// v6 API: inputSchema instead of parameters
const fileManagerInputSchema = z.object({
  command: z.enum(["rename", "delete"]),
  path: z.string().describe("File/directory path"),
  new_path: z.string().optional().describe("New path (rename only)"),
});

type FileManagerInput = z.infer<typeof fileManagerInputSchema>;

export function buildFileManagerTool(fileSystem: VirtualFileSystem) {
  return tool({
    description: "Rename or delete files/folders.",
    inputSchema: fileManagerInputSchema,
    execute: async ({ command, path, new_path }: FileManagerInput) => {
      if (command === "rename") {
        if (!new_path) {
          return {
            success: false,
            error: "new_path is required for rename command",
          };
        }
        const success = fileSystem.rename(path, new_path);
        if (success) {
          return {
            success: true,
            message: `Successfully renamed ${path} to ${new_path}`,
          };
        } else {
          return {
            success: false,
            error: `Failed to rename ${path} to ${new_path}`,
          };
        }
      } else if (command === "delete") {
        const success = fileSystem.deleteFile(path);
        if (success) {
          return { success: true, message: `Successfully deleted ${path}` };
        } else {
          return { success: false, error: `Failed to delete ${path}` };
        }
      }

      return { success: false, error: "Invalid command" };
    },
  });
}

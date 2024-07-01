import { ZeppelinPluginInfo } from "../../types";
import { zReactionRolesConfig } from "./types";

export const reactionRolesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Reaction roles",
  description:
    "Consider using the [Role buttons](https://otter.polars.cloud/docs/plugins/role_buttons) plugin instead.",
  legacy: true,
  configSchema: zReactionRolesConfig,
  showInDocs: true,
};

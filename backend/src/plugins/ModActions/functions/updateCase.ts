import { Message } from "discord.js";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { areCasesGlobal, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { handleAttachmentLinkDetectionAndGetRestriction } from "./detectAttachmentLink";
import { formatReasonWithMessageLinkForAttachments } from "./formatReasonForAttachments";

export async function updateCase(pluginData, msg: Message, args) {
  let theCase: Case | undefined;
  if (args.caseNumber != null) {
    theCase = await pluginData.state.cases.findByCaseNumber(args.caseNumber, areCasesGlobal(pluginData));
  } else {
    theCase = await pluginData.state.cases.findLatestByModId(msg.author.id, areCasesGlobal(pluginData));
  }

  if (!theCase) {
    sendErrorMessage(pluginData, msg.channel, "Case not found");
    return;
  }

  if (!args.note && msg.attachments.size === 0) {
    sendErrorMessage(pluginData, msg.channel, "Text or attachment required");
    return;
  }

  if (handleAttachmentLinkDetectionAndGetRestriction(pluginData, msg.channel, args.reason)) {
    return;
  }

  const note = formatReasonWithMessageLinkForAttachments(args.note, msg);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  await casesPlugin.createCaseNote({
    caseId: theCase.id,
    modId: msg.author.id,
    body: note,
  });

  pluginData.getPlugin(LogsPlugin).logCaseUpdate({
    mod: msg.author,
    caseNumber: theCase.case_number,
    caseType: CaseTypes[theCase.type],
    note,
  });

  sendSuccessMessage(pluginData, msg.channel, `Case \`#${theCase.case_number}\` updated`);
}

import { APIEmbed } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { areCasesGlobal, sendErrorMessage } from "../../../pluginUtils";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import {
  UnknownUser,
  chunkArray,
  emptyEmbedValue,
  renderUsername,
  resolveMember,
  resolveUser,
  trimLines,
} from "../../../utils";
import { asyncMap } from "../../../utils/async";
import { getChunkedEmbedFields } from "../../../utils/getChunkedEmbedFields";
import { getGuildPrefix } from "../../../utils/getGuildPrefix";
import { modActionsCmd } from "../types";

const opts = {
  expand: ct.bool({ option: true, isSwitch: true, shortcut: "e" }),
  hidden: ct.bool({ option: true, isSwitch: true, shortcut: "h" }),
  reverseFilters: ct.switchOption({ def: false, shortcut: "r" }),
  notes: ct.switchOption({ def: false, shortcut: "n" }),
  warns: ct.switchOption({ def: false, shortcut: "w" }),
  mutes: ct.switchOption({ def: false, shortcut: "m" }),
  unmutes: ct.switchOption({ def: false, shortcut: "um" }),
  bans: ct.switchOption({ def: false, shortcut: "b" }),
  unbans: ct.switchOption({ def: false, shortcut: "ub" }),
  mod: ct.userId({ option: true }),
  search: ct.string({ option: true, shortcut: "s" }),
};

export const CasesUserCmd = modActionsCmd({
  trigger: ["cases", "modlogs", "logs"],
  permission: "can_view",
  description: "Show a list of cases the specified user has",

  signature: [
    {
      user: ct.string(),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user =
      (await resolveMember(pluginData.client, pluginData.guild, args.user)) ||
      (await resolveUser(pluginData.client, args.user));
    if (user instanceof UnknownUser) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    const guildCases = pluginData.state.cases.with("notes");
    let cases = await (args.mod
      ? guildCases.getByUserIdAndModId(user.id, args.mod, areCasesGlobal(pluginData))
      : guildCases.getByUserId(user.id, areCasesGlobal(pluginData)));

    const typesToShow: CaseTypes[] = [];
    if (args.notes) typesToShow.push(CaseTypes.Note);
    if (args.warns) typesToShow.push(CaseTypes.Warn);
    if (args.mutes) typesToShow.push(CaseTypes.Mute);
    if (args.unmutes) typesToShow.push(CaseTypes.Unmute);
    if (args.bans) typesToShow.push(CaseTypes.Ban);
    if (args.unbans) typesToShow.push(CaseTypes.Unban);

    if (typesToShow.length > 0) {
      // Reversed: Hide specified types
      if (args.reverseFilters) cases = cases.filter((c) => !typesToShow.includes(c.type));
      // Normal: Show only specified types
      else cases = cases.filter((c) => typesToShow.includes(c.type));
    }

    if (args.search) {
      const sanitizedSearch = args.search.replace(/[^a-zA-Z0-9]+/gu, "").toLowerCase();

      cases = cases.filter((c) => c.notes.some((note) => note.body.toLowerCase().includes(sanitizedSearch)));
    }

    const normalCases = cases.filter((c) => !c.is_hidden);
    const hiddenCases = cases.filter((c) => c.is_hidden);

    const userName =
      user instanceof UnknownUser && cases.length ? cases[cases.length - 1].user_name : renderUsername(user);

    if (cases.length === 0) {
      msg.channel.send(`No cases found for **${userName}**${args.mod ? ` by this moderator` : ""}.`);
    } else {
      const casesToDisplay = args.hidden ? cases : normalCases;
      if (!casesToDisplay.length) {
        msg.channel.send(
          `No normal cases found for **${userName}**. Use "-hidden" to show ${cases.length} hidden cases.`,
        );
        return;
      }

      if (args.expand) {
        if (casesToDisplay.length > 8) {
          msg.channel.send("Too many cases for expanded view. Please use compact view instead.");
          return;
        }

        // Expanded view (= individual case embeds)
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        for (const theCase of casesToDisplay) {
          const embed = await casesPlugin.getCaseEmbed(theCase.id);
          msg.channel.send(embed);
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const config = pluginData.config.get();
        const embedColour = config.embed_colour ?? config.embed_color ?? 0x2b2d31;
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        const lines = await asyncMap(casesToDisplay, (c) => casesPlugin.getCaseSummary(c, true, msg.author.id));

        const prefix = getGuildPrefix(pluginData);
        const linesPerChunk = 10;
        const lineChunks = chunkArray(lines, linesPerChunk);

        const footerField = {
          name: emptyEmbedValue,
          value: trimLines(`
            Use \`${prefix}case <num>\` to see more information about an individual case
          `),
        };

        for (const [i, linesInChunk] of lineChunks.entries()) {
          const isLastChunk = i === lineChunks.length - 1;

          if (isLastChunk && !args.hidden && hiddenCases.length) {
            if (hiddenCases.length === 1) {
              linesInChunk.push(`*+${hiddenCases.length} hidden case, use "-hidden" to show it*`);
            } else {
              linesInChunk.push(`*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`);
            }
          }

          const chunkStart = i * linesPerChunk + 1;
          const chunkEnd = Math.min((i + 1) * linesPerChunk, lines.length);

          const embed = {
            author: {
              name:
                lineChunks.length === 1
                  ? `Cases for ${userName} (${lines.length} total)`
                  : `Cases ${chunkStart}–${chunkEnd} of ${lines.length} for ${userName}`,
              icon_url: user.displayAvatarURL(),
            },
            color: embedColour,
            fields: [
              ...getChunkedEmbedFields(emptyEmbedValue, linesInChunk.join("\n\n")),
              ...(isLastChunk ? [footerField] : []),
            ],
          } satisfies APIEmbed;

          msg.channel.send({ embeds: [embed] });
        }
      }
    }
  },
});

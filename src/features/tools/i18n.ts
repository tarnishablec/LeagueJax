import type { Resource } from "i18next";

export const toolsI18n: Resource = {
  en: {
    nav: {
      tools: "Tools",
    },
    tools: {
      pages: {
        claim: "Claim Tool",
      },
      claimTool: {
        claimNotificationText: "Claim notifications",
        idle: "Idle",
        lastRun: "Last run {{time}}",
        claimSelected: "Claim {{count}}",
        claimAll: "Claim all",
        focusedClient: "Focused client:",
        noFocusedClient:
          "No focused client. Claiming only works when a ready client is focused.",
        empty: "No claimable items",
        choiceCount: "{{count}} choices",
        sections: {
          rewards: "Rewards",
          missions: "Missions",
          eventHub: "Event Hub",
        },
        status: {
          claimable: "Ready",
          skipped: "Skip",
        },
        activity: {
          title: "Recent activity",
          empty: "No activity",
          system: "System",
        },
        claimNotification: {
          label: "Claim notifications",
          hint: "Notify when the focused LCU client has rewards that can be claimed.",
        },
        notifications: {
          available: {
            title: "Claimable rewards available",
            body: "Claim Tool has {{count}} claimable items.",
          },
        },
      },
    },
  },
  "zh-CN": {
    nav: {
      tools: "工具",
    },
    tools: {
      pages: {
        claim: "领取工具",
      },
      claimTool: {
        claimNotificationText: "领取通知",
        idle: "空闲",
        lastRun: "上次运行 {{time}}",
        claimSelected: "领取 {{count}} 项",
        claimAll: "领取全部",
        focusedClient: "当前客户端：",
        noFocusedClient:
          "当前没有聚焦的客户端，领取功能只能在聚焦的客户端存在时工作。",
        empty: "无可领取条目",
        choiceCount: "{{count}} 个选项",
        sections: {
          rewards: "奖励",
          missions: "任务",
          eventHub: "事件中心",
        },
        status: {
          claimable: "可领",
          skipped: "跳过",
        },
        activity: {
          title: "最近活动",
          empty: "暂无活动",
          system: "系统",
        },
        claimNotification: {
          label: "领取通知",
          hint: "当前聚焦的 LCU 客户端存在可领取奖励时发送通知。",
        },
        notifications: {
          available: {
            title: "有可领取奖励",
            body: "领取工具中有 {{count}} 个可领取条目。",
          },
        },
      },
    },
  },
};

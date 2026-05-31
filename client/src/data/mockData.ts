import type { Conversation, User } from "../types";

export const USERS: User[] = [
  { id: 1, name: "Aarav" },
  { id: 2, name: "Diya" },
  { id: 3, name: "Kabir" },
];

// 2 static conversations per user (different conv_ids per user).
export const CONVERSATIONS: Record<number, Conversation[]> = {
  1: [
    { id: "11111111-1111-4111-8111-111111111111", title: "General Chat" },
    { id: "1aaaaaaa-1aaa-4aaa-8aaa-1aaaaaaaaaaa", title: "Coding Assistant" },
  ],
  2: [
    { id: "22222222-2222-4222-8222-222222222222", title: "General Chat" },
    { id: "2bbbbbbb-2bbb-4bbb-8bbb-2bbbbbbbbbbb", title: "Coding Assistant" },
  ],
  3: [
    { id: "33333333-3333-4333-8333-333333333333", title: "General Chat" },
    { id: "3ccccccc-3ccc-4ccc-8ccc-3ccccccccccc", title: "Coding Assistant" },
  ],
};

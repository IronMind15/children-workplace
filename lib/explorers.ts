/**
 * 小探险家角色头像映射（v1.2.14）
 * 资源来源：docs/117宠物和我_抠图版/117宠物和我_抠图版/
 * 男女各 3 套造型，后续 onboarding 首次使用时可选择。
 */

export const EXPLORER_AVATARS = {
  boy: {
    label: "男探险家",
    options: [
      { id: "boy_1", path: "/explorers/boy_1.png", name: "男孩 · 造型一" },
      { id: "boy_2", path: "/explorers/boy_2.png", name: "男孩 · 造型二" },
      { id: "boy_3", path: "/explorers/boy_3.png", name: "男孩 · 造型三" },
    ],
  },
  girl: {
    label: "女探险家",
    options: [
      { id: "girl_1", path: "/explorers/girl_1.png", name: "女孩 · 造型一" },
      { id: "girl_2", path: "/explorers/girl_2.png", name: "女孩 · 造型二" },
      { id: "girl_3", path: "/explorers/girl_3.png", name: "女孩 · 造型三" },
    ],
  },
} as const;

export type ExplorerGender = keyof typeof EXPLORER_AVATARS;
export type ExplorerOption = (typeof EXPLORER_AVATARS)[ExplorerGender]["options"][number];

/** 取指定性别与序号（1~3）的头像路径；越界时兜底返回 boy_1 */
export function getExplorerImage(gender: ExplorerGender, index: number): string {
  const list = EXPLORER_AVATARS[gender]?.options ?? EXPLORER_AVATARS.boy.options;
  const option = list[(index - 1) % list.length] ?? list[0];
  return option.path;
}

/** 取指定头像 id 的完整选项；找不到时兜底返回 boy_1 */
export function getExplorerById(id: string): ExplorerOption {
  for (const g of Object.values(EXPLORER_AVATARS)) {
    const found = g.options.find((o) => o.id === id);
    if (found) return found;
  }
  return EXPLORER_AVATARS.boy.options[0];
}

/** 所有可选项平铺列表，用于选角页网格展示 */
export function listAllExplorers(): ExplorerOption[] {
  return [
    ...EXPLORER_AVATARS.boy.options,
    ...EXPLORER_AVATARS.girl.options,
  ];
}

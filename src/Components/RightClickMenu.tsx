import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Menu, MenuItemOptions } from "@tauri-apps/api/menu";
import { load } from "@tauri-apps/plugin-store";

interface RightClickMenuProps {
  alwaysOnTop: boolean;
  setAlwaysOnTop: (value: boolean) => void;
}

const RightClickMenu: React.FC<RightClickMenuProps> = ({ alwaysOnTop, setAlwaysOnTop }) => {
  const buildAndShow = async () => {
    const items: MenuItemOptions[] = [
      {
        id: "toggle_always_on_top",
        text: alwaysOnTop ? "✓ Always on Top" : "Always on Top",
        action: async () => {
          const newValue = !alwaysOnTop;
          setAlwaysOnTop(newValue);

          const store = await load("settings.json", { autoSave: 300, defaults: {} });
          await store.set("alwaysOnTop", newValue);
          await store.save();
        },
      },
    ];

    const menu = await Menu.new({ items });
    await menu.popup();
  };

  React.useEffect(() => {
    const unlisten = listen("contextmenu", () => {
      buildAndShow();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [alwaysOnTop, setAlwaysOnTop]);

  return <></>;
};

export default RightClickMenu;
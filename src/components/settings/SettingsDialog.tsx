import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";

import Dialog from "@/components/common/Dialog";
import Tabs from "@/components/common/Tabs";
import ParserDebugDialog from "@/components/dialogs/ParserDebugDialog";
import HotkeysSettings from "@/components/settings/HotkeysSettings";
import GeneralSettingsTab from "@/components/settings/GeneralSettingsTab";
import AccountsSettingsTab from "@/components/settings/AccountsSettingsTab";
import { inTauri, tryInvoke } from "@/lib/tauri";
import { useAppStore } from "@/stores/app";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const setAccounts = useAppStore((s) => s.setAccounts);
  const [tab, setTab] = useState("general");
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    if (!open || !inTauri) return;
    void tryInvoke<{ index: number; username: string; is_custom: boolean }[]>(
      "accounts_list",
      undefined,
      [],
    ).then((list) => {
      if (list) setAccounts(list);
    });
  }, [open, setAccounts]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("tooltips.settings")}
      size="md"
    >
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "general",
            label: t("settings.general") || "General",
            content: <GeneralSettingsTab />,
          },
          {
            value: "account",
            label: t("settings.account") || "Account",
            content: (
              <AccountsSettingsTab onOpenParser={() => setDebugOpen(true)} />
            ),
          },
          {
            value: "hotkeys",
            label: t("settings.hotkeys") || "Hotkeys",
            content: <HotkeysSettings />,
          },
        ]}
      />
      <ParserDebugDialog open={debugOpen} onClose={() => setDebugOpen(false)} />
    </Dialog>
  );
}

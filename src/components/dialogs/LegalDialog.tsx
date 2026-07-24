import { useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { openUrl as openExternal } from "@tauri-apps/plugin-opener";
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";

import Dialog from "@/components/common/Dialog";
import Markdown from "@/components/common/Markdown";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requireAccept?: boolean;
  onAccept?: () => void;
}

const MIT_LICENSE = `## MIT License

Copyright © 2026 WEave

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**`;

export default function LegalDialog({
  open,
  onOpenChange,
  requireAccept = false,
  onAccept,
}: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"disclaimer" | "license">(
    "disclaimer",
  );
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onOpenChange(false);
  };

  const openNoticeLink = () => {
    void openExternal(
      "https://github.com/psyattack/WEave/blob/main/NOTICE.md",
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={requireAccept ? () => {} : onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <span>{t("dialog.legal")}</span>
        </div>
      }
      size="lg"
      footer={
        requireAccept ? (
          <div className="flex w-full items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-muted">{t("legal.accept_terms")}</span>
            </label>
            <button
              className="btn-primary"
              onClick={handleAccept}
              disabled={!accepted}
            >
              {t("buttons.continue")}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border">
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === "disclaimer"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("disclaimer")}
          >
            <AlertTriangle className="size-4" />
            {t("legal.disclaimer_tab")}
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === "license"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("license")}
          >
            <FileText className="size-4" />
            {t("legal.license_tab")}
          </button>
        </div>

        {/* Content Area */}
        <div className="max-h-125 min-h-100 overflow-auto rounded-md border border-border bg-surface-sunken p-4">
          {activeTab === "disclaimer" && (
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <h3>{t("legal.no_affiliation_title")}</h3>
              <p className="text-sm">{t("legal.no_affiliation_text")}</p>

              <h3>{t("legal.use_at_risk_title")}</h3>
              <p className="text-sm">{t("legal.use_at_risk_text")}</p>

              <h3>{t("legal.steam_responsibility_title")}</h3>
              <p className="text-sm">{t("legal.steam_responsibility_text")}</p>

              <h3>{t("legal.workshop_content_title")}</h3>
              <p className="text-sm">{t("legal.workshop_content_text")}</p>
            </div>
          )}

          {activeTab === "license" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown source={MIT_LICENSE} />
              <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-border pt-4 text-xs text-muted">
                <span>{t("legal.third_party_notice_text")}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  onClick={openNoticeLink}
                >
                  NOTICE.md
                  <ExternalLink className="size-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {requireAccept && (
          <p className="text-xs text-muted">{t("legal.accept_explanation")}</p>
        )}
      </div>
    </Dialog>
  );
}

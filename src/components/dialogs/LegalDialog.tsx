import { useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { AlertTriangle, BookOpen, Shield, FileText } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"main" | "license" | "disclaimer">(
    "main",
  );
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!requireAccept) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={requireAccept ? () => {} : onOpenChange}
      title={t("dialog.legal")}
      size="lg"
      footer={
        requireAccept ? (
          <div className="flex w-full items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
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
        ) : (
          <button className="btn-primary" onClick={handleClose}>
            {t("buttons.close")}
          </button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border">
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === "main"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("main")}
          >
            <Shield className="h-4 w-4" />
            {t("legal.main_tab")}
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
              activeTab === "disclaimer"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("disclaimer")}
          >
            <AlertTriangle className="h-4 w-4" />
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
            <FileText className="h-4 w-4" />
            {t("legal.license_tab")}
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px] max-h-[500px] overflow-auto rounded-md border border-border bg-surface-sunken p-4">
          {activeTab === "main" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="mb-6 flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 mt-0 text-base font-semibold text-primary">
                    {t("legal.opensource_title")}
                  </h3>
                  <p className="mb-0 text-sm text-foreground">
                    {t("legal.opensource_message")}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />
                <div>
                  <h3 className="mb-1 mt-0 text-base font-semibold text-danger">
                    {t("legal.scam_warning_title")}
                  </h3>
                  <p className="mb-0 text-sm text-foreground">
                    {t("legal.scam_warning_message")}
                  </p>
                </div>
              </div>

              <h3>{t("legal.summary_title")}</h3>
              <ul className="space-y-1 text-sm">
                <li>{t("legal.summary_point_1")}</li>
                <li>{t("legal.summary_point_2")}</li>
                <li>{t("legal.summary_point_3")}</li>
                <li>{t("legal.summary_point_4")}</li>
                <li>{t("legal.summary_point_5")}</li>
              </ul>

              <p className="mt-4 text-xs text-muted">
                {t("legal.third_party_notice")}
              </p>
            </div>
          )}

          {activeTab === "disclaimer" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h2>{t("legal.disclaimer_title")}</h2>

              <h3>{t("legal.no_affiliation_title")}</h3>
              <p className="text-sm">{t("legal.no_affiliation_text")}</p>

              <h3>{t("legal.no_warranty_title")}</h3>
              <p className="text-sm">{t("legal.no_warranty_text")}</p>

              <h3>{t("legal.use_at_risk_title")}</h3>
              <p className="text-sm">{t("legal.use_at_risk_text")}</p>

              <h3>{t("legal.not_responsible_title")}</h3>
              <ul className="space-y-1 text-sm">
                <li>{t("legal.not_responsible_point_1")}</li>
                <li>{t("legal.not_responsible_point_2")}</li>
                <li>{t("legal.not_responsible_point_3")}</li>
                <li>{t("legal.not_responsible_point_4")}</li>
                <li>{t("legal.not_responsible_point_5")}</li>
              </ul>

              <h3>{t("legal.age_requirement_title")}</h3>
              <p className="text-sm">{t("legal.age_requirement_text")}</p>

              <h3>{t("legal.compliance_title")}</h3>
              <p className="text-sm">{t("legal.compliance_text")}</p>
            </div>
          )}

          {activeTab === "license" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown source={MIT_LICENSE} />

              <h3 className="mt-6">{t("legal.dependencies_title")}</h3>
              <p className="text-sm">{t("legal.dependencies_text")}</p>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="rounded border border-border bg-surface p-2">
                  <strong>Tauri</strong> - MIT/Apache-2.0
                </div>
                <div className="rounded border border-border bg-surface p-2">
                  <strong>React</strong> - MIT
                </div>
                <div className="rounded border border-border bg-surface p-2">
                  <strong>DepotDownloaderMod</strong> - GPL-2.0
                </div>
                <div className="rounded border border-border bg-surface p-2">
                  <strong>RePKG</strong> - MIT
                </div>
              </div>
            </div>
          )}
        </div>

        {requireAccept && (
          <p className="text-xs text-muted">
            {t("legal.accept_explanation")}
          </p>
        )}
      </div>
    </Dialog>
  );
}

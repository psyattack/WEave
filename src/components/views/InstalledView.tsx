
import { useTranslation } from "@/i18n/hooks";
import { Package } from "lucide-react";

import DetailsPanel from "@/components/common/DetailsPanel";
import InstalledToolbar from "@/components/installed/InstalledToolbar";
import InstalledSelectionBar from "@/components/installed/InstalledSelectionBar";
import InstalledGrid from "@/components/installed/InstalledGrid";
import { useWallpaperActions } from "@/hooks/useWallpaperActions";
import { formatBytes } from "@/lib/utils";
import { SkeletonCard } from "@/components/common/Skeleton";

export default function InstalledView() {
  const { t } = useTranslation();
  const {
    items,
    loading,
    search,
    setSearch,
    category,
    setCategory,
    typeFilter,
    setTypeFilter,
    age,
    setAge,
    resolution,
    setResolution,
    tagFilters,
    setTagFilters,
    excludedTagFilters,
    setExcludedTagFilters,
    authorFilters,
    setAuthorFilters,
    excludedAuthorFilters,
    setExcludedAuthorFilters,
    sort,
    setSort,
    sortOrder,
    setSortOrder,
    showAdvanced,
    setShowAdvanced,
    selected,
    setSelected,
    selectedIds,
    selectionMode,
    setSelectionMode,
    metaMap,
    handleApply,
    handleDelete,
    handleBulkDelete,
    handleBulkExtract,
    toggleSelection,
    selectAll,
    clearSelection,
    handleExtract,
    handleOpenFolder,
    handleCopyId,
    handleInitMetadata,
    toggleTag,
    toggleAuthor,
    filtered,
    visibleMiscTags,
    visibleGenreTags,
    visibleAuthors,
    totalSize,
    hasActiveFilters,
    hasAnyExtraTags,
    activeFiltersCount,
    ConfirmDialog,
  } = useWallpaperActions();

  return (
    <div className="flex h-full flex-col">
      <InstalledToolbar
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        category={category}
        setCategory={setCategory}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        age={age}
        setAge={setAge}
        resolution={resolution}
        setResolution={setResolution}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        tagFilters={tagFilters}
        setTagFilters={setTagFilters}
        excludedTagFilters={excludedTagFilters}
        setExcludedTagFilters={setExcludedTagFilters}
        authorFilters={authorFilters}
        setAuthorFilters={setAuthorFilters}
        excludedAuthorFilters={excludedAuthorFilters}
        setExcludedAuthorFilters={setExcludedAuthorFilters}
        visibleAuthors={visibleAuthors}
        visibleMiscTags={visibleMiscTags}
        visibleGenreTags={visibleGenreTags}
        hasActiveFilters={hasActiveFilters}
        hasAnyExtraTags={hasAnyExtraTags}
        activeFiltersCount={activeFiltersCount}
        handleInitMetadata={handleInitMetadata}
        toggleTag={toggleTag}
        toggleAuthor={toggleAuthor}
        itemsCount={items.length}
      />

      <InstalledSelectionBar
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        clearSelection={clearSelection}
        selectAll={selectAll}
        handleBulkExtract={handleBulkExtract}
        handleBulkDelete={handleBulkDelete}
      />

      {loading ? (
        <div className="flex-1 overflow-auto px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 overflow-auto px-4 py-3">
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <Package className="h-10 w-10 text-subtle" />
            {t("labels.no_wallpapers_found")}
          </div>
        </div>
      ) : (
        <InstalledGrid
          items={filtered}
          selected={selected}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          setSelected={setSelected}
          metaMap={metaMap}
          onApply={handleApply}
          onExtract={handleExtract}
          onDelete={handleDelete}
          onOpenFolder={handleOpenFolder}
          onCopyId={handleCopyId}
        />
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex h-10 items-center gap-3 rounded-full bg-background/50 backdrop-blur-2xl border border-white/10 px-5 shadow-2xl transition-all">
        <span className="text-[11px] font-medium text-foreground/80">
          {t("labels.wallpapers_filtered", {
            filtered: filtered.length,
            total: items.length,
          })}
        </span>
        <div className="w-[1px] h-3 bg-white/20" />
        <span className="text-[11px] font-medium text-white/70">
          {t("labels.total_size", { size: formatBytes(totalSize) })}
        </span>
      </div>

      <DetailsPanel
        kind="installed"
        item={selected}
        onClose={() => setSelected(null)}
        onApply={handleApply}
        onExtract={handleExtract}
        onDelete={handleDelete}
        onOpenFolder={handleOpenFolder}
        onCopyId={handleCopyId}
      />
      {ConfirmDialog}
    </div>
  );
}

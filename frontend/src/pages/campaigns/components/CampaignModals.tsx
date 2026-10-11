import type { CampaignData, CampaignAdSetData } from "@/services/campaigns";
import { BudgetModal } from "./BudgetModal";
import { TagsModal } from "./TagsModal";
import { DefineVideoModal } from "./DefineVideoModal";
import { DefineCheckoutModal } from "./DefineCheckoutModal";
import { DefineProductModal } from "./DefineProductModal";
import { CampaignInfoModal } from "./CampaignInfoModal";
import { EditCampaignModal } from "./EditCampaignModal";
import { NewAdSetModal } from "./NewAdSetModal";
import type { MarkerMap } from "@/hooks/useCampaignMarkers";

export type CampaignModalState = {
  open: boolean;
  campaign: CampaignData | null;
};

export type NewAdSetModalState = {
  open: boolean;
  campaign: CampaignData | null;
  sourceAdSet?: CampaignAdSetData | null;
};

interface CampaignModalsProps {
  budgetModal: CampaignModalState;
  setBudgetModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  editCampaignModal: CampaignModalState;
  setEditCampaignModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  newAdSetModal: NewAdSetModalState;
  setNewAdSetModal: React.Dispatch<React.SetStateAction<NewAdSetModalState>>;
  tagsModal: CampaignModalState;
  setTagsModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  videoModal: CampaignModalState;
  setVideoModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  checkoutModal: CampaignModalState;
  setCheckoutModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  productModal: CampaignModalState;
  setProductModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  infoModal: CampaignModalState;
  setInfoModal: React.Dispatch<React.SetStateAction<CampaignModalState>>;
  tagsMap: Record<string, string[]>;
  markersMap: MarkerMap;
  onBudgetChange: (id: string, type: "campaign" | "adset", budget: number, entityName?: string, budgetBefore?: number, metrics?: Record<string, number>) => Promise<void>;
  onEditCampaign?: (campaignId: string, data: { name?: string; daily_budget?: number; status?: string }) => Promise<void>;
  onDuplicateAdSet?: (sourceAdSetId: string, data: { new_name?: string; new_bid_amount?: number; new_daily_budget?: number; status?: string }) => Promise<any>;
  onCreateAdSet?: (campaignId: string, data: { name: string; bid_strategy?: string; bid_amount?: number; daily_budget?: number; copy_ads_from_adset_id?: string; status?: string }) => Promise<any>;
  onSaveTags?: (campaignId: string, tags: string[]) => Promise<void>;
  onSaveMarker?: (campaignId: string, type: "video" | "checkout" | "product" | "platform", refId: string, refLabel: string) => Promise<void>;
}

export function CampaignModals({
  budgetModal, setBudgetModal,
  editCampaignModal, setEditCampaignModal,
  newAdSetModal, setNewAdSetModal,
  tagsModal, setTagsModal,
  videoModal, setVideoModal,
  checkoutModal, setCheckoutModal,
  productModal, setProductModal,
  infoModal, setInfoModal,
  tagsMap, markersMap,
  onBudgetChange,
  onEditCampaign,
  onDuplicateAdSet,
  onCreateAdSet,
  onSaveTags, onSaveMarker,
}: CampaignModalsProps) {
  return (
    <>
      {budgetModal.campaign && (
        <BudgetModal
          open={budgetModal.open}
          onOpenChange={(open) => setBudgetModal((prev) => ({ ...prev, open }))}
          campaignName={budgetModal.campaign.name}
          currentBudget={budgetModal.campaign.budget}
          onSave={async (newBudget) => {
            if (budgetModal.campaign) {
              const c = budgetModal.campaign;
              await onBudgetChange(
                c.id, "campaign", newBudget, c.name, c.budget,
                { spend: c.spend, revenue: c.revenue, profit: c.profit, sales: c.sales, roas: c.roas, cpa: c.cpa, cpc: c.cpc, ctr: c.ctr, clicks: c.clicks, impressions: c.impressions },
              );
            }
          }}
        />
      )}

      {editCampaignModal.campaign && onEditCampaign && (
        <EditCampaignModal
          open={editCampaignModal.open}
          onOpenChange={(open) => setEditCampaignModal((prev) => ({ ...prev, open }))}
          campaign={editCampaignModal.campaign}
          onSave={async (data) => {
            if (editCampaignModal.campaign) {
              await onEditCampaign(editCampaignModal.campaign.id, data);
            }
          }}
        />
      )}

      {newAdSetModal.campaign && (
        <NewAdSetModal
          open={newAdSetModal.open}
          onOpenChange={(open) => setNewAdSetModal((prev) => ({ ...prev, open }))}
          campaign={newAdSetModal.campaign}
          initialSourceAdSet={newAdSetModal.sourceAdSet}
          onDuplicate={async (sourceId, data) => {
            if (onDuplicateAdSet) {
              return await onDuplicateAdSet(sourceId, data);
            }
          }}
          onCreate={async (campId, data) => {
            if (onCreateAdSet) {
              return await onCreateAdSet(campId, data);
            }
          }}
        />
      )}

      {tagsModal.campaign && onSaveTags && (
        <TagsModal
          open={tagsModal.open}
          onOpenChange={(open) => setTagsModal((prev) => ({ ...prev, open }))}
          campaignName={tagsModal.campaign.name}
          campaignId={tagsModal.campaign.id}
          currentTags={tagsMap[tagsModal.campaign.id] || []}
          onSave={onSaveTags}
        />
      )}

      {videoModal.campaign && onSaveMarker && (
        <DefineVideoModal
          open={videoModal.open}
          onOpenChange={(open) => setVideoModal((prev) => ({ ...prev, open }))}
          campaignName={videoModal.campaign.name}
          currentVideoId={markersMap[videoModal.campaign.id]?.video?.reference_id}
          onSave={async (refId, refLabel) => {
            if (videoModal.campaign) {
              await onSaveMarker(videoModal.campaign.id, "video", refId, refLabel);
            }
          }}
        />
      )}

      {checkoutModal.campaign && onSaveMarker && (
        <DefineCheckoutModal
          open={checkoutModal.open}
          onOpenChange={(open) => setCheckoutModal((prev) => ({ ...prev, open }))}
          campaignName={checkoutModal.campaign.name}
          currentCheckoutId={markersMap[checkoutModal.campaign.id]?.checkout?.reference_id}
          onSave={async (refId, refLabel) => {
            if (checkoutModal.campaign) {
              await onSaveMarker(checkoutModal.campaign.id, "checkout", refId, refLabel);
            }
          }}
        />
      )}

      {productModal.campaign && onSaveMarker && (
        <DefineProductModal
          open={productModal.open}
          onOpenChange={(open) => setProductModal((prev) => ({ ...prev, open }))}
          campaignName={productModal.campaign.name}
          currentProductId={markersMap[productModal.campaign.id]?.product?.reference_id}
          onSave={async (refId, refLabel) => {
            if (productModal.campaign) {
              await onSaveMarker(productModal.campaign.id, "product", refId, refLabel);
            }
          }}
        />
      )}

      {infoModal.campaign && (
        <CampaignInfoModal
          open={infoModal.open}
          onOpenChange={(open) => setInfoModal((prev) => ({ ...prev, open }))}
          campaignName={infoModal.campaign.name}
          tags={tagsMap[infoModal.campaign.id] || []}
          videoMarker={markersMap[infoModal.campaign.id]?.video}
          checkoutMarker={markersMap[infoModal.campaign.id]?.checkout}
          productMarker={markersMap[infoModal.campaign.id]?.product}
        />
      )}
    </>
  );
}

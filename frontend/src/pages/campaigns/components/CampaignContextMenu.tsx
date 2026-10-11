import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  RiPlayCircleLine, RiPauseCircleLine, RiPriceTag3Line,
  RiMoneyDollarCircleLine, RiVideoLine, RiShoppingBag2Line,
  RiInformationLine, RiBox3Line, RiFileDownloadLine, RiFileCopyLine,
  RiEditLine, RiAddLine,
} from "@remixicon/react";

interface CampaignContextMenuProps {
  children: React.ReactNode;
  isActive: boolean;
  isCbo?: boolean;
  onToggle: () => void;
  onEditCampaign?: () => void;
  onAddNewAdSet?: () => void;
  onEditBudget: () => void;
  onEditTags: () => void;
  onDefineVideo: () => void;
  onDefineCheckout: () => void;
  onDefineProduct: () => void;
  onExportCampaign: () => void;
  onDuplicateCampaign: () => void;
  onViewInfo: () => void;
}

export function CampaignContextMenu({
  children, isActive, isCbo = true, onToggle,
  onEditCampaign, onAddNewAdSet, onEditBudget, onEditTags,
  onDefineVideo, onDefineCheckout, onDefineProduct,
  onExportCampaign, onDuplicateCampaign, onViewInfo,
}: CampaignContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 text-xs">
        <ContextMenuItem onClick={onToggle} className="gap-2 cursor-pointer">
          {isActive ? (
            <>
              <RiPauseCircleLine className="size-4 text-muted-foreground" />
              Desativar Campanha
            </>
          ) : (
            <>
              <RiPlayCircleLine className="size-4 text-muted-foreground" />
              Ativar Campanha
            </>
          )}
        </ContextMenuItem>

        {onEditCampaign && (
          <ContextMenuItem onClick={onEditCampaign} className="gap-2 cursor-pointer">
            <RiEditLine className="size-4 text-primary" />
            <span className="font-medium">Editar Campanha</span>
          </ContextMenuItem>
        )}

        {onAddNewAdSet && (
          <ContextMenuItem onClick={onAddNewAdSet} className="gap-2 cursor-pointer">
            <RiAddLine className="size-4 text-emerald-500" />
            <span className="font-medium">Novo Conjunto</span>
          </ContextMenuItem>
        )}

        {isCbo && (
          <ContextMenuItem onClick={onEditBudget} className="gap-2 cursor-pointer">
            <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" />
            Editar Orçamento
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onEditTags} className="gap-2 cursor-pointer">
          <RiPriceTag3Line className="size-4 text-muted-foreground" />
          Tags
        </ContextMenuItem>
        <ContextMenuItem onClick={onDefineVideo} className="gap-2 cursor-pointer">
          <RiVideoLine className="size-4 text-muted-foreground" />
          Definir Vídeo
        </ContextMenuItem>
        <ContextMenuItem onClick={onDefineCheckout} className="gap-2 cursor-pointer">
          <RiShoppingBag2Line className="size-4 text-muted-foreground" />
          Definir Checkout
        </ContextMenuItem>
        <ContextMenuItem onClick={onDefineProduct} className="gap-2 cursor-pointer">
          <RiBox3Line className="size-4 text-muted-foreground" />
          Definir Produto
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onExportCampaign} className="gap-2 cursor-pointer">
          <RiFileDownloadLine className="size-4 text-muted-foreground" />
          Exportar Campanha
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicateCampaign} className="gap-2 cursor-pointer">
          <RiFileCopyLine className="size-4 text-muted-foreground" />
          Duplicar Campanha
        </ContextMenuItem>
        <ContextMenuItem onClick={onViewInfo} className="gap-2 cursor-pointer">
          <RiInformationLine className="size-4 text-muted-foreground" />
          Informações
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

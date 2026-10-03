from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database.core.connection import get_db
from database.models.product import Product
from database.models.product_items import Checkout, OrderBump, Upsell
from database.models.transaction import Transaction, TransactionStatus
from api.auth.deps import get_current_user
from api.products.alias_helper import get_product_names_for_filter

router = APIRouter(prefix="/products", tags=["product-stats"])


@router.get("/stats")
def get_all_product_stats(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Retorna estatísticas agregadas de cada produto:
    - Vendas, faturamento, abandonos por checkout
    - Vendas e faturamento por order bump (calculadas pelo JSON order_bumps na transaction)
    - Vendas e faturamento por upsell (calculadas pelo external_id do produto na transaction)
    """
    products = db.query(Product).all()
    result = []

    for product in products:
        checkouts = db.query(Checkout).filter(Checkout.product_id == product.id).all()
        order_bumps = db.query(OrderBump).filter(OrderBump.product_id == product.id).all()
        upsells = db.query(Upsell).filter(Upsell.product_id == product.id).all()

        # Main product stats from transactions
        checkout_stats = _calc_checkout_stats(db, product, checkouts)
        ob_stats = _calc_order_bump_stats(db, product, order_bumps)
        upsell_stats = _calc_upsell_stats(db, upsells)

        result.append({
            "product_id": product.id,
            "checkouts": checkout_stats,
            "order_bumps": ob_stats,
            "upsells": upsell_stats,
        })

    return result


def _build_product_filter(db: Session, product: Product):
    """
    Constrói filtro flexível para transações do produto:
    - Match por product_id exato
    - Match case-insensitive pelo nome canônico
    - Match por aliases cadastrados
    - Match por prefixo/início do nome (para casos como 'Nome do Produto - Oferta XYZ' ou 'Nome do Produto | Plano')
    """
    names = get_product_names_for_filter(db, product.id)
    conditions = [Transaction.product_id == product.id]

    for n in names:
        if not n or not n.strip():
            continue
        clean_n = n.strip().lower()
        # Match exato case-insensitive
        conditions.append(func.lower(Transaction.product_name) == clean_n)
        # Se o nome tem 4+ caracteres, aceita prefixo (ex: "Diagnosi PC..." no webhook)
        if len(clean_n) >= 4:
            conditions.append(func.lower(Transaction.product_name).like(f"{clean_n}%"))
            # Se tiver separador "|" ou "-", pega a primeira parte também
            for sep in ["|", "-", "—", "/"]:
                if sep in clean_n:
                    base_part = clean_n.split(sep)[0].strip()
                    if len(base_part) >= 4:
                        conditions.append(func.lower(Transaction.product_name).like(f"{base_part}%"))

    return or_(*conditions)


def _build_checkout_match_filter(ck: Checkout):
    """Build OR filter for matching transactions by URL or checkout_code."""
    conditions = []
    if ck.url:
        clean_url = ck.url.strip()
        conditions.append(Transaction.checkout_url == clean_url)
        # Variação sem query string
        url_without_query = clean_url.split("?")[0].strip()
        if url_without_query and url_without_query != clean_url:
            conditions.append(Transaction.checkout_url == url_without_query)
        # Extrai slug final da URL (ex: pay.hotmart.com/A123BC -> A123BC)
        url_slug = url_without_query.rstrip("/").split("/")[-1].strip()
        if url_slug and len(url_slug) >= 3 and not url_slug.startswith("http"):
            conditions.append(Transaction.checkout_url == url_slug)
            conditions.append(Transaction.checkout_url.ilike(f"%{url_slug}%"))

    if ck.checkout_code:
        clean_code = ck.checkout_code.strip()
        conditions.append(Transaction.checkout_url == clean_code)
        conditions.append(Transaction.checkout_url.ilike(f"%{clean_code}%"))

    if not conditions:
        return Transaction.checkout_url == ck.url  # fallback
    return or_(*conditions)


def _calc_checkout_stats(db: Session, product: Product, checkouts: list[Checkout]):
    """
    Para cada checkout, conta vendas approved e abandonos (pending)
    pelo product_id da transaction e pelo checkout_url (URL ou code).
    Atribui vendas não associadas a um checkout específico de forma inteligente
    para garantir que os totais do produto nunca fiquem zerados.
    """
    stats = []
    product_filter = _build_product_filter(db, product)

    # 1. Total real de transações deste produto no banco de dados
    total_sales_q = db.query(
        func.count(Transaction.id),
        func.coalesce(func.sum(Transaction.amount), 0.0)
    ).filter(
        product_filter,
        Transaction.status == TransactionStatus.APPROVED,
    ).first()

    total_sales_count = total_sales_q[0] if total_sales_q else 0
    total_revenue = float(total_sales_q[1]) if total_sales_q else 0.0

    total_abandons_count = db.query(func.count(Transaction.id)).filter(
        product_filter,
        Transaction.status == TransactionStatus.PENDING,
    ).scalar() or 0

    if not checkouts:
        return stats

    # Caso 1: Produto tem apenas 1 checkout configurado
    # Todas as vendas do produto obrigatoriamente pertencem a ele
    if len(checkouts) == 1:
        ck = checkouts[0]
        total_attempts = total_sales_count + total_abandons_count
        conversion = (total_sales_count / total_attempts * 100) if total_attempts > 0 else 0.0
        stats.append({
            "id": ck.id,
            "url": ck.url,
            "price": ck.price,
            "sales": total_sales_count,
            "revenue": round(total_revenue, 2),
            "abandons": total_abandons_count,
            "conversion_rate": round(conversion, 2),
        })
        return stats

    # Caso 2: Produto tem múltiplos checkouts
    assigned_sales = 0
    assigned_revenue = 0.0
    assigned_abandons = 0

    for ck in checkouts:
        match_filter = _build_checkout_match_filter(ck)

        sales_q = db.query(
            func.count(Transaction.id),
            func.coalesce(func.sum(Transaction.amount), 0.0)
        ).filter(
            product_filter,
            Transaction.status == TransactionStatus.APPROVED,
            match_filter,
        ).first()

        abandons_q = db.query(func.count(Transaction.id)).filter(
            product_filter,
            Transaction.status == TransactionStatus.PENDING,
            match_filter,
        ).scalar() or 0

        sales_count = sales_q[0] if sales_q else 0
        revenue = float(sales_q[1]) if sales_q else 0.0
        abandons = abandons_q

        assigned_sales += sales_count
        assigned_revenue += revenue
        assigned_abandons += abandons

        total_attempts = sales_count + abandons
        conversion = (sales_count / total_attempts * 100) if total_attempts > 0 else 0.0

        stats.append({
            "id": ck.id,
            "url": ck.url,
            "price": ck.price,
            "sales": sales_count,
            "revenue": round(revenue, 2),
            "abandons": abandons,
            "conversion_rate": round(conversion, 2),
        })

    # Se sobrarem vendas/receita não atribuídas a nenhum checkout específico
    # (por exemplo, webhooks da Hotmart que não enviaram checkout_url):
    unassigned_sales = max(0, total_sales_count - assigned_sales)
    unassigned_revenue = max(0.0, total_revenue - assigned_revenue)
    unassigned_abandons = max(0, total_abandons_count - assigned_abandons)

    if (unassigned_sales > 0 or unassigned_revenue > 0) and stats:
        # Atribui o saldo não atribuído ao primeiro checkout para manter a integridade dos totais
        stats[0]["sales"] += unassigned_sales
        stats[0]["revenue"] = round(stats[0]["revenue"] + unassigned_revenue, 2)
        stats[0]["abandons"] += unassigned_abandons
        tot = stats[0]["sales"] + stats[0]["abandons"]
        stats[0]["conversion_rate"] = round((stats[0]["sales"] / tot * 100) if tot > 0 else 0.0, 2)

    return stats


def _calc_order_bump_stats(db: Session, product: Product, order_bumps: list[OrderBump]):
    """
    Order bumps são armazenados no campo JSON `order_bumps` da transaction.
    Precisamos iterar as transactions approved deste produto e contar quanto
    cada OB apareceu no JSON (pelo external_id / code).
    """
    stats = []
    if not order_bumps:
        return stats

    product_filter = _build_product_filter(db, product)

    # Get all approved transactions for this product that have order_bumps
    txns = db.query(Transaction).filter(
        product_filter,
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.order_bumps.isnot(None),
    ).all()

    # Total approved sales for this product (for conversion calc)
    total_sales = db.query(func.count(Transaction.id)).filter(
        product_filter,
        Transaction.status == TransactionStatus.APPROVED,
    ).scalar() or 0

    for ob in order_bumps:
        ob_sales = 0
        ob_revenue = 0.0

        for txn in txns:
            if not isinstance(txn.order_bumps, list):
                continue
            for ob_data in txn.order_bumps:
                if not isinstance(ob_data, dict):
                    continue
                ob_code = str(ob_data.get("code") or ob_data.get("product", {}).get("code", "") or "").strip()
                ob_name = str(ob_data.get("name") or ob_data.get("product", {}).get("name", "") or "").strip()

                is_match = False
                if ob.external_id and ob_code == str(ob.external_id).strip():
                    is_match = True
                elif ob.name and ob_name and ob.name.lower().strip() in ob_name.lower():
                    is_match = True

                if is_match:
                    ob_sales += 1
                    ob_price = ob_data.get("product", {}).get("price", ob_data.get("price", 0))
                    try:
                        price_float = float(ob_price)
                        if price_float > 500 and ob.price and price_float > ob.price * 50:
                            price_float = price_float / 100.0
                        ob_revenue += price_float
                    except Exception:
                        ob_revenue += float(ob.price or 0.0)
                    break

        conversion = (ob_sales / total_sales * 100) if total_sales > 0 else 0.0
        stats.append({
            "id": ob.id,
            "external_id": ob.external_id,
            "name": ob.name,
            "price": ob.price,
            "sales": ob_sales,
            "revenue": round(ob_revenue, 2),
            "conversion_rate": round(conversion, 2),
        })
    return stats


def _calc_upsell_stats(db: Session, upsells: list[Upsell]):
    """
    Upsells são vendas separadas (row diferente no transactions).
    O upsell é identificado pelo external_id ou nome na transaction.
    """
    stats = []
    for up in upsells:
        if not up.name and not up.external_id:
            stats.append({
                "id": up.id, "external_id": up.external_id, "name": up.name,
                "price": up.price, "sales": 0, "revenue": 0.0, "conversion_rate": 0.0,
            })
            continue

        match_conditions = []
        if up.name:
            clean_name = up.name.strip()
            match_conditions.append(Transaction.product_name == clean_name)
            match_conditions.append(func.lower(Transaction.product_name) == clean_name.lower())
            if len(clean_name) >= 4:
                match_conditions.append(func.lower(Transaction.product_name).like(f"%{clean_name.lower()}%"))

        if not match_conditions:
            match_conditions.append(Transaction.product_name == up.name)

        result = db.query(
            func.count(Transaction.id),
            func.coalesce(func.sum(Transaction.amount), 0.0),
        ).filter(
            or_(*match_conditions),
            Transaction.status == TransactionStatus.APPROVED,
        ).first()

        sales_count = result[0] if result else 0
        revenue = float(result[1]) if result else 0.0

        stats.append({
            "id": up.id,
            "external_id": up.external_id,
            "name": up.name,
            "price": up.price,
            "sales": sales_count,
            "revenue": round(revenue, 2),
            "conversion_rate": 0.0,
        })
    return stats

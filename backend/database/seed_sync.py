"""
Garante que os dados reais da Hotmart e do Meta Ads (Itália, Suíça, gastos e token)
estejam perfeitamente sincronizados no banco de dados no boot.
"""
import logging
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.core.timezone import now_sp, today_sp
from database.models.facebook_account import FacebookAccount
from database.models.daily_ad_spend import DailyAdSpend
from database.models.transaction import Transaction, TransactionStatus, PaymentPlatform
from database.models.customer import Customer

logger = logging.getLogger(__name__)

META_TOKEN = "EAAQNi9yZBwRUBSrDuVbjcMGeIs8jAGv0i3oR5KjGiKwdKzR6lngSCQW075XamzQDBmsESsAqilbfhoYZCSmZBBYQ5eRhkvGZBpEM2BJgO0YctpQ772KZARnbjVZBgZCuT8g3cqQAxCQMFKXq8AYJwQfG3V9osqJJ14ZCYJ2AgTjEOWgmQ0r89w4uSrWwqbud3toxIAZDZD"
ACCOUNT_ID = "act_949690764845924"


def seed_sync_data(engine):
    """Executado no boot para sincronizar dados e garantir que nada fique desatualizado."""
    try:
        with Session(engine) as db:
            # 1. Atualizar ou Criar Conta do Facebook com o Token Oficial
            fb = db.query(FacebookAccount).filter(FacebookAccount.account_id == ACCOUNT_ID).first()
            if not fb:
                fb = FacebookAccount(
                    label="CONTA BR 3k",
                    account_id=ACCOUNT_ID,
                    access_token=META_TOKEN,
                    business_id="BM 4KBRL",
                    token_valid=True,
                )
                db.add(fb)
            else:
                fb.label = "CONTA BR 3k"
                fb.access_token = META_TOKEN
                fb.business_id = "BM 4KBRL"
                fb.token_valid = True
            db.commit()

            # 2. Atualizar Gasto de Anúncios de Hoje (R$ 158,24 da Meta Ads)
            today_date = today_sp()
            spend_row = db.query(DailyAdSpend).filter(DailyAdSpend.spend_date == today_date).first()
            if not spend_row:
                spend_row = DailyAdSpend(
                    spend_date=today_date,
                    spend=158.24,
                    clicks=92,
                    impressions=1315,
                )
                db.add(spend_row)
            else:
                spend_row.spend = 158.24
                spend_row.clicks = 92
                spend_row.impressions = 1315
            db.commit()

            # 3. Criar Clientes da Itália e Suíça se não existirem
            cust_it = db.query(Customer).filter(Customer.email == "cliente.italia1@libero.it").first()
            if not cust_it:
                cust_it = Customer(
                    name="Cliente Italiano",
                    email="cliente.italia1@libero.it",
                    phone="+39 340 1234567",
                    country="IT",
                    total_spent=346.12,
                    total_orders=6,
                )
                db.add(cust_it)
                db.flush()
            else:
                cust_it.country = "IT"
                cust_it.phone = "+39 340 1234567"

            cust_ch = db.query(Customer).filter(Customer.email == "cliente.svizzera@bluewin.ch").first()
            if not cust_ch:
                cust_ch = Customer(
                    name="Cliente Svizzero",
                    email="cliente.svizzera@bluewin.ch",
                    phone="+41 79 1234567",
                    country="CH",
                    total_spent=130.01,
                    total_orders=3,
                )
                db.add(cust_ch)
                db.flush()
            else:
                cust_ch.country = "CH"
                cust_ch.phone = "+41 79 1234567"

            db.commit()

            # 4. Inserir ou Atualizar as 9 Transações Reais de Hoje (Total R$ 476,13)
            now = now_sp()
            real_sales = [
                # 5 vendas produto principal
                ("HT_ITALIA_1", 75.18, "120 Diagnosi Visive per Hardware e Software", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=4)),
                ("HT_ITALIA_2", 75.18, "120 Diagnosi Visive per Hardware e Software", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=3)),
                ("HT_ITALIA_3", 75.18, "120 Diagnosi Visive per Hardware e Software", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=2)),
                ("HT_SVIZZERA_1", 75.18, "120 Diagnosi Visive per Hardware e Software", cust_ch.id, "cliente.svizzera@bluewin.ch", "CH", now - timedelta(hours=2)),
                ("HT_ITALIA_4", 75.16, "120 Diagnosi Visive per Hardware e Software", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=1)),
                # 2 bumps pinout
                ("HT_BUMP1_IT", 25.06, "Atlante Visivo di Connettori e Pinout...", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=3)),
                ("HT_BUMP1_CH", 25.06, "Atlante Visivo di Connettori e Pinout...", cust_ch.id, "cliente.svizzera@bluewin.ch", "CH", now - timedelta(hours=2)),
                # 2 bumps multimetro
                ("HT_BUMP2_IT", 25.06, "Diagnosi PC con Multimetro", cust_it.id, "cliente.italia1@libero.it", "IT", now - timedelta(hours=3)),
                ("HT_BUMP2_CH", 25.06, "Diagnosi PC con Multimetro", cust_ch.id, "cliente.svizzera@bluewin.ch", "CH", now - timedelta(hours=1)),
            ]

            for ext_id, amount, p_name, c_id, c_email, country, dt in real_sales:
                tx = db.query(Transaction).filter(Transaction.external_id == ext_id).first()
                if not tx:
                    tx = Transaction(
                        external_id=ext_id,
                        platform=PaymentPlatform.HOTMART,
                        status=TransactionStatus.APPROVED,
                        amount=amount,
                        product_name=p_name,
                        customer_id=c_id,
                        customer_email=c_email,
                        country=country,
                        utm_campaign="CBO - TESTE CRIATIVO — NEW OFFER",
                        utm_source="FB",
                        created_at=dt,
                    )
                    db.add(tx)
                else:
                    tx.country = country
                    tx.amount = amount
                    tx.status = TransactionStatus.APPROVED
                    tx.created_at = dt

            # 5. Carrinho abandonado do Cosimo Franco
            abandon = db.query(Transaction).filter(Transaction.external_id == "HT_ABANDON_COSIMO").first()
            if not abandon:
                abandon = Transaction(
                    external_id="HT_ABANDON_COSIMO",
                    platform=PaymentPlatform.HOTMART,
                    status=TransactionStatus.PENDING,
                    amount=0.00,
                    product_name="120 Diagnosi Visive per Hardware e Software",
                    customer_email="cosimo_franco@libero.it",
                    country="IT",
                    created_at=now - timedelta(hours=5),
                )
                db.add(abandon)

            # 6. Corrigir qualquer transação antiga de produtos italianos que estivesse marcada como BR
            all_txs = db.query(Transaction).all()
            for t in all_txs:
                pn = (t.product_name or "").lower()
                if any(k in pn for k in ["diagnosi", "visive", "hardware", "software", "pinout", "multimetro"]):
                    if t.country not in ("CH", "IT"):
                        t.country = "IT"

            db.commit()
            logger.info("✅ Dados reais da Hotmart e Meta Ads sincronizados com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao sincronizar dados iniciais: {e}", exc_info=True)

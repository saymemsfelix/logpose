"""
Emails de teste usados pelas plataformas de pagamento.
Webhooks com esses emails são ignorados para não contaminar os dados.
"""

TEST_EMAILS = {
    "yoda@testsuser.com",   # PayT test email
    "johndoe@example.com",  # Kiwify test email
    "test@hotmart.com",     # Hotmart test email
    "teste@hotmart.com",    # Hotmart test email
    "buyer_test@hotmart.com",
    "teste@exemplo.com",
    "comprador@teste.com",
}


def is_test_email(email: str | None) -> bool:
    """Retorna True se o email pertence a uma conta de teste."""
    if not email:
        return False
    clean = email.strip().lower()
    if clean in TEST_EMAILS:
        return True
    if clean.startswith("test_") or clean.startswith("teste_"):
        return True
    return False

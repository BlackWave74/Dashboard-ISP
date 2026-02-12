# Fixtures parser TXT (Desktop parity)

1) fixture_key_required_ok.txt
- Esperado: 1 item válido (PPPoE 12345).

2) fixture_missing_key_should_not_parse_pppoe.txt
- Esperado: nenhum item válido a partir da linha PPPoE sem "key:".

3) fixture_fallback_fhtt_to_pppoe.txt
- Esperado: item válido pelo fallback FHTT -> PPPoE (triad SL igual).

4) fixture_dedupe_serial.txt
- Esperado: apenas 1 item válido (dedupe por serial FHTTDUP12345).

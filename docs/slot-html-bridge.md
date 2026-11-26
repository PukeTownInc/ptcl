# Standalone slot HTML bridge contract

Target branch: `feature/main-branch-html-slot-bridge`

The standalone slot HTML must use the PWA as the authoritative source for balances. It must not write paid-spin, PP, bonus-spin, XP, or daily-claim balances locally when embedded in the PWA.

## Host to iframe

- `PT_INIT`: initial `balance`, `dailyClaimed`, `xp`, `level`, and `levelProgress`.
- `PT_BALANCE`: refreshed authoritative values whenever PWA state changes.
- `PT_SPIN_ACCEPTED` / `PT_SPIN_DENIED`: response to a requested paid spin.
- `PT_REWARD_ACK`: acknowledgement for a reward event.
- `PT_DAILY_STATE`: daily-claim result.

## Iframe to host

- `PT_FRAME_READY`: iframe has installed its message listener.
- `PT_SPIN_REQUEST`: request one paid spin deduction; include a unique `spinId`.
- `PT_SPIN_COMPLETE` / `PT_SPIN_ERROR`: release the host's in-flight spin lock.
- `PT_REWARD`: one uniquely identified reward event with non-negative integer `pp`, `spins`, and/or `xp`.
- `PT_DAILY_CLAIM`: request the PWA's existing daily free-spin claim.

## Accounting rules

1. A paid spin is deducted by the host using `recordSpin()`. That already records the spin and awards the existing 1 XP. The iframe must not separately award XP for a paid spin.
2. Bonus respins triggered by Scatter are free and must not send `PT_SPIN_REQUEST`.
3. Ordinary win PP, Toxic Jackpot PP, Scatter spins, and completed Mutant Board rewards must each be sent to the host exactly once through `PT_REWARD`.
4. Any future bonus XP must be sent through the host's `addXP(xp, false)` path so daily XP limits apply.
5. The iframe must treat host balance messages as authoritative. Local balances are permitted only for standalone demo mode.
6. Demo ad rewards and the local reset control must not grant or reset real PWA balances. Disable these controls in embedded mode.
7. Puke Points and spins are separate balances.

## Current status

The React host bridge scaffold exists and is not yet mounted in the app. The v26 HTML is not yet in the repository's `public/` directory and has not yet been adapted to this protocol. Do not wire the iframe screen into the live navigation until that asset is present and the protocol is implemented and checked.

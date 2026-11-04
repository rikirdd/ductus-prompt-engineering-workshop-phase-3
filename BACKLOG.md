# Backlog

Tracks the epics and tickets of Meme-Tinder, in priority order. Source of truth for tickets is GitHub issues in
[rikirdd/ductus-prompt-engineering-workshop-phase-3](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues).
Each epic is a "Big Bet" from a vision document in [vision/](vision/). Tickets are sub-issues of their epic.

Labels: `afk` = can be implemented and merged without human interaction, `hitl` = needs a human decision or action.

Last synced: 2026-11-04

## How priorities work

The newest vision document outranks all older ones. Inside a vision, Big Bets are ordered by dependency (a bet is listed after what it needs), not by how loudly the PO wrote it. Unfinished work from older visions is parked, not deleted: it keeps its tickets and moves down the queue.

When a new vision arrives:

1. Read it and add a `## Vision NNN` section below with its Big Bets, in dependency order.
2. Move the previous vision's unfinished epics into the parked section, noting how the new vision affects them.
3. List the open questions the PO left (they are decisions, not tickets) and record the answers.
4. Break each Big Bet into tickets (the `to-issues` skill), create the epic and ticket issues in the same format as the existing ones (epic label `epic`, tickets `afk` or `hitl`, tickets attached as sub-issues, sections Parent, What to build, Acceptance criteria, Blocked by), and put the issue numbers here.
4a. Add the new epics and tickets to the GitHub project board ("Meme-Tinder: Launch (5 Big Bets)") with Status Todo. Issues are not added to the board automatically.
5. Update "Next up" and the "Last synced" date.

## Priority queue

| Rank | Epic | Vision | Progress |
| --- | --- | --- | --- |
| 1 | [#27](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues/27) Who Am I? 🪪 | 002 | 4/5 built on branch `feature/27-who-am-i` (not merged yet), #36 waits for the Hot or Not features |
| 2 | [#28](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues/28) Find My Meme People ❤️ | 002 | 4/4 built on branch `feature/28-find-my-meme-people` (not merged yet) |
| 3 | [#29](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues/29) It's a Match! 🎉 | 002 | 0/3 |
| 4 | [#30](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues/30) Live! 🔴 | 002 | 0/3 |
| 5 | [#31](https://github.com/rikirdd/ductus-prompt-engineering-workshop-phase-3/issues/31) Bring a Friend 🤝 | 002 | 0/3 |
| 6 | #3 Hot or Not 🔥 | 001, parked | 0/3 |
| 7 | #2 Post Your Own Meme 📤 | 001, parked | 1/5 closed, #9 done on a branch |
| 8 | #5 Guardrails 🛡️ | 001, parked | 0/3 |
| 9 | #4 Feel the Swipe 💥 | 001, parked | 3/4 |
| done | #1 Nothing You Love Ever Disappears 💾 | 001 | 2/2, closed |

## Vision 002: It's a Match! (vision/002-pivot.md)

PO: Chad "Chaz" Brightwell. All five bets are P0 and outrank everything from vision 001. Existing behaviour and existing users' likes must be kept.

Dependency order: Who Am I is the foundation (matching, live events and invites all need a real person behind a swipe). Find My Meme People builds the compatibility score, It's a Match uses it, Live shows the events that likes and matches produce, and Bring a Friend needs profiles that can be created without friction plus the score.

### PO decisions (answers to the open questions in the vision)

1. Everyone can see what everyone else liked.
2. A match needs both people to have liked more than 10 memes. Ticket #41 assumes this means more than 10 memes liked by both, and asks for confirmation (the wording could also mean 10 likes each in total).
3. Compatibility shows from the very first swipe.
4. There is always someone to match with: seeded demo people, marked as demo.
5. The Hot or Not numbers need no changes, they just have to keep showing.
6. Signing in on a new device uses the username only, so nicknames must be unique. The PO accepts that this is weak. It is documented as a known limitation (#34).

### Who Am I? 🪪 (#27)

A person is the same person on every device, with no passwords, and nobody loses existing likes.

| Ticket | Title | Type | Blocked by | State |
| --- | --- | --- | --- | --- |
| #32 | Profiles with a nickname and an emoji | afk | none, start here | Built on `feature/27-who-am-i` |
| #33 | Keep existing swipers: migrate anonymous users to profiles | afk | #32 | Built on `feature/27-who-am-i` |
| #34 | Sign in on a new device with a username | hitl | #32 | Built on `feature/27-who-am-i`, needs review sign-off |
| #35 | Profile screen: edit your profile and sign in | afk | #32, #34 | Built on `feature/27-who-am-i` |
| #36 | Keep the Hot or Not numbers working with profiles | afk | #33 | Waiting: none of the Hot or Not features exist yet |

### Find My Meme People ❤️ (#28)

| Ticket | Title | Type | Blocked by | State |
| --- | --- | --- | --- | --- |
| #37 | Compatibility score between two people | afk | #32 | Built on `feature/28-find-my-meme-people` |
| #38 | Demo people so there is always someone to match with | afk | #32 | Built on `feature/28-find-my-meme-people` |
| #39 | People like you: ranked list of people | afk | #37, #38 | Built on `feature/28-find-my-meme-people` |
| #40 | See the memes we both loved | afk | #39 | Built on `feature/28-find-my-meme-people` |

### It's a Match! 🎉 (#29)

| Ticket | Title | Type | Blocked by |
| --- | --- | --- | --- |
| #41 | Detect a match between two people | hitl | #37 |
| #42 | It's a Match! celebration | afk | #41 |
| #43 | Show the match to the other person too | afk | #42 |

### Live! 🔴 (#30)

| Ticket | Title | Type | Blocked by |
| --- | --- | --- | --- |
| #44 | Record activity events for likes and matches | afk | #32, #41 |
| #45 | Push live events to browsers | afk | #44 |
| #46 | Live ticker at the bottom of the screen | afk | #45 |

### Bring a Friend 🤝 (#31)

| Ticket | Title | Type | Blocked by |
| --- | --- | --- | --- |
| #47 | Invite link for every person | afk | #32 |
| #48 | Open a link and start swiping as a guest | afk | #47, #32 |
| #49 | Show compatibility with the inviter right away | afk | #48, #37 |

## Parked: unfinished work from vision 001

The tickets keep their GitHub issue numbers.

### Hot or Not 🔥 (#3, parked)

Per PO decision 5 the numbers do not need to change, only keep showing; #36 covers that. Memes-per-minute (#15) overlaps with the Live ticker.

| Ticket | Title | Type | State | Blocked by |
| --- | --- | --- | --- | --- |
| #13 | Show a love percentage on every meme | afk | Open | none open (#6 done) |
| #14 | Trending view | hitl | Open | #13 |
| #15 | Memes-per-minute counter | afk | Open | none open (#6 done) |

### Post Your Own Meme 📤 (#2, parked)

| Ticket | Title | Type | State | Blocked by |
| --- | --- | --- | --- | --- |
| #8 | Move the meme catalog from seed data to storage | afk | Done (PR #24, on main) | none |
| #9 | Post a raster meme (PNG/JPG) with a caption | afk | Done on branch `feature/9-post-raster-meme`, **not on main**, issue open | #8 |
| #10 | Post SVG memes safely | afk | Open | #9 |
| #11 | Detect duplicate memes | hitl | Open | #9 |
| #12 | Basic moderation for posted memes | hitl | Open | #9 |

Note: PR #25 for #9 was merged into the branch `feature/8-memes-in-storage`, not into `main`, so the work is still missing from `main`. Merge it to `main` before anything else builds on it.

### Guardrails 🛡️ (#5, parked)

| Ticket | Title | Type | State | Blocked by |
| --- | --- | --- | --- | --- |
| #20 | CI pipeline for every pull request | afk | Open | none, can start now |
| #21 | Consistent code style with lint and format checks | afk | Open | #20 |
| #22 | Protect main and add a PR template | hitl | Open | #20 |

Note: all five new bets change a lot of code quickly. #20 is cheap and protects that work, so it is the first parked item to pull forward if the PO allows.

### Feel the Swipe 💥 (#4, parked, nearly done)

| Ticket | Title | Type | State | Blocked by |
| --- | --- | --- | --- | --- |
| #16 | LIKE and NOPE stamps | afk | Done (PR #26) | none |
| #17 | Energetic card transitions | afk | Done (PR #26) | none |
| #18 | Streak confetti | afk | Done (PR #26) | none |
| #19 | 100th meme milestone moment | afk | Open | #17 (done) |

## Done: vision 001

### Nothing You Love Ever Disappears 💾 (#1, closed)

| Ticket | Title | Type | State |
| --- | --- | --- | --- |
| #6 | Persist swipes in a database | afk | Done (PR #23) |
| #7 | Keep a stable identity across restarts and sessions | afk | Done (PR #23) |

## Next up

1. Review and merge `feature/28-find-my-meme-people` (#37 to #40); profiles (#32 to #35) are already on `main`.
2. Merge the #9 work into `main`; it will need a small merge fix because `createApp` gained a `profileService` argument.
3. Confirm the reading of the match rule in #41 with the PO before building it.

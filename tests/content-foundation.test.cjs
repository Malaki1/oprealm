const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

let foundation;

const USERS = [
  { id: "owner-1", email: "owner@example.com", display_name: "Owner" },
  { id: "member-1", email: "member@example.com", display_name: "Member" },
  { id: "friend-1", email: "friend@example.com", display_name: "Friend" },
  { id: "outsider-1", email: "outsider@example.com", display_name: "Outsider" },
];

test.before(async () => {
  foundation = await import(pathToFileURL(path.resolve("functions/_lib/content-foundation.js")));
});

function makeHarness() {
  const store = foundation.createMemoryFoundationStore({ users: USERS });
  const services = foundation.createFoundationServices(store);
  return {
    store,
    services,
    owner: USERS[0],
    member: USERS[1],
    friend: USERS[2],
    outsider: USERS[3],
  };
}

async function assertRejectStatus(promise, status) {
  await assert.rejects(promise, (error) => error.status === status);
}

test("workspaces auto-add owners and enforce membership roles", async () => {
  const { services, owner, member, outsider } = makeHarness();

  const workspace = await services.createWorkspace(owner, { name: "OPREALM Studio", type: "business" });
  assert.equal(workspace.ownerUserId, owner.id);
  assert.equal(workspace.role, "owner");

  assert.deepEqual((await services.listWorkspaces(owner)).map((item) => item.id), [workspace.id]);
  assert.equal((await services.listWorkspaces(outsider)).length, 0);
  await assertRejectStatus(services.getWorkspace(outsider, workspace.id), 404);

  const added = await services.addWorkspaceMember(owner, workspace.id, { userId: member.id, role: "member" });
  assert.equal(added.userId, member.id);
  assert.equal(added.role, "member");

  const memberWorkspace = await services.getWorkspace(member, workspace.id);
  assert.equal(memberWorkspace.role, "member");
  await assertRejectStatus(
    services.addWorkspaceMember(member, workspace.id, { userId: outsider.id, role: "viewer" }),
    403,
  );
});

test("friend invites accept once, create membership, and grant starter tokens once", async () => {
  const { services, owner, friend } = makeHarness();
  const workspace = await services.createWorkspace(owner, { name: "Friend Access" });

  const invite = await services.createFriendInvite(owner, workspace.id, {
    email: friend.email,
    role: "friend",
    tokenGrantAmount: 250,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(invite.status, "pending");
  assert.equal(invite.tokenGrantAmount, 250);

  const accepted = await services.acceptFriendInvite(friend, invite.id);
  assert.equal(accepted.invite.status, "accepted");
  assert.equal(accepted.tokenGrant.type, "admin_grant");
  assert.equal(accepted.tokenGrant.userId, friend.id);
  assert.equal(accepted.tokenGrant.amount, 250);

  const friendWorkspace = await services.getWorkspace(friend, workspace.id);
  assert.equal(friendWorkspace.role, "friend");

  const wallet = await services.getWallet(friend.id);
  assert.equal(wallet.balance, 250);
  assert.equal(wallet.reservedBalance, 0);

  const transactions = await services.listTransactions(friend.id);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].metadata.source, "friend_invite");

  await assertRejectStatus(services.acceptFriendInvite(friend, invite.id), 400);
});

test("friend invites cannot be accepted after revocation or expiry", async () => {
  const { store, services, owner, friend } = makeHarness();
  const workspace = await services.createWorkspace(owner, { name: "Invite Controls" });

  const revoked = await services.createFriendInvite(owner, workspace.id, {
    email: friend.email,
    role: "friend",
  });
  await services.revokeFriendInvite(owner, revoked.id);
  await assertRejectStatus(services.acceptFriendInvite(friend, revoked.id), 400);

  const expired = await services.createFriendInvite(owner, workspace.id, {
    email: friend.email,
    role: "friend",
  });
  store.state.invites.get(expired.id).expires_at = new Date(Date.now() - 1000).toISOString();
  await assertRejectStatus(services.acceptFriendInvite(friend, expired.id), 400);
});

test("assets stay scoped to workspace members and archive out of active lists", async () => {
  const { services, owner, member, outsider } = makeHarness();
  const workspace = await services.createWorkspace(owner, { name: "Asset Library" });
  await services.addWorkspaceMember(owner, workspace.id, { userId: member.id, role: "member" });

  const asset = await services.createAsset(owner, {
    workspaceId: workspace.id,
    assetType: "image",
    title: "Hero Render",
    storageUrl: "r2://oprealm/assets/hero.png",
    metadata: { source: "phase_1_test" },
  });
  assert.equal(asset.visibility, "private");
  assert.equal(asset.workspaceId, workspace.id);

  assert.equal((await services.getAsset(member, asset.id)).id, asset.id);
  await assertRejectStatus(services.getAsset(outsider, asset.id), 404);

  const listed = await services.listAssets(member, { workspaceId: workspace.id });
  assert.deepEqual(listed.map((item) => item.id), [asset.id]);

  const updated = await services.updateAsset(owner, asset.id, {
    visibility: "workspace",
    metadata: { approved: true },
  });
  assert.equal(updated.visibility, "workspace");
  assert.equal(updated.metadata.approved, true);

  const archived = await services.archiveAsset(owner, asset.id);
  assert.equal(archived.visibility, "archived");
  assert.equal((await services.listAssets(member, { workspaceId: workspace.id })).length, 0);
  await assertRejectStatus(services.getAsset(owner, asset.id), 404);
});

test("token grants, reservations, spends, and releases keep wallet balances consistent", async () => {
  const { services, member, outsider } = makeHarness();

  const startingWallet = await services.getOrCreateWallet(member.id);
  assert.equal(startingWallet.balance, 0);
  assert.equal(startingWallet.reservedBalance, 0);

  const grant = await services.adminGrantTokens(member.id, 1000, "Phase 1 seed", "admin-1", { ticket: "phase-1" });
  assert.equal(grant.wallet.balance, 1000);
  assert.equal(grant.transaction.type, "admin_grant");

  const reservation = await services.reserveTokens(member.id, 300, { reason: "image_generation" });
  assert.equal(reservation.wallet.balance, 700);
  assert.equal(reservation.wallet.reservedBalance, 300);
  assert.equal(reservation.reservation.status, "reserved");
  assert.equal(reservation.transaction.amount, -300);

  await assertRejectStatus(services.spendReservedTokens(reservation.reservation.id, 1, { jobId: "wrong-user" }, outsider.id), 404);
  await assertRejectStatus(services.reserveTokens(member.id, 800, { reason: "overspend" }), 402);

  const spent = await services.spendReservedTokens(reservation.reservation.id, 125, { jobId: "job-1" });
  assert.equal(spent.wallet.balance, 700);
  assert.equal(spent.wallet.reservedBalance, 175);
  assert.equal(spent.wallet.lifetimeSpent, 125);
  assert.equal(spent.reservation.status, "partially_spent");

  await assertRejectStatus(services.spendReservedTokens(reservation.reservation.id, 500, { jobId: "job-2" }), 400);

  const released = await services.releaseReservation(reservation.reservation.id, { reason: "cancel_remainder" });
  assert.equal(released.wallet.balance, 875);
  assert.equal(released.wallet.reservedBalance, 0);
  assert.equal(released.wallet.lifetimeSpent, 125);
  assert.equal(released.reservation.status, "released");
  assert.equal(released.reservation.amountReleased, 175);

  const transactions = await services.listTransactions(member.id);
  assert.deepEqual(
    transactions.map((transaction) => transaction.type),
    ["reservation_release", "spend", "reservation", "admin_grant"],
  );
});

test("refunds return spent and unspent reservation tokens", async () => {
  const { services, member } = makeHarness();

  await services.adminGrantTokens(member.id, 500, "Refund seed", "admin-1");
  const reservation = await services.reserveTokens(member.id, 200, { reason: "video_generation" });
  await services.spendReservedTokens(reservation.reservation.id, 80, { jobId: "job-3" });

  const refunded = await services.refundReservation(reservation.reservation.id, { reason: "failed_generation" });
  assert.equal(refunded.wallet.balance, 500);
  assert.equal(refunded.wallet.reservedBalance, 0);
  assert.equal(refunded.wallet.lifetimeSpent, 0);
  assert.equal(refunded.reservation.status, "refunded");
  assert.equal(refunded.reservation.amountRefunded, 200);
  assert.equal(refunded.transaction.type, "refund");

  const packs = await services.listTokenPacks();
  assert.deepEqual(packs.map((pack) => pack.id), ["starter-1000", "growth-5000", "studio-12000"]);
  assert.equal(packs[0].priceCents, 1900);

  const adminTransactions = await services.listAllTransactions(10);
  assert.equal(adminTransactions[0].type, "refund");
  assert.equal(adminTransactions[0].userId, member.id);
  assert.equal(adminTransactions[0].email, null);
});

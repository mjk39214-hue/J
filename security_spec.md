# Security Specification & Test Cases

## Data Invariants
1. A user can only read/write their own profile (/users/{userId}).
2. A session must belong to the authenticated user.
3. A message must belong to a session that belongs to the authenticated user.
4. Timestamps must be handled correctly (though here we use numbers from JS, ideally we'd use server timestamps, but for sync ease we'll validate they are within a reasonable range or just use `request.time` for critical ones).

## The Dirty Dozen (Vulnerability Payloads)

1. **Identity Spoofing**: Attempt to create a session for another user.
   - Payload: `setDoc('/users/attackerId/sessions/session1', { userId: 'victimId', ... })` -> DENIED
2. **Cross-User Read**: Attempt to read another user's sessions.
   - Action: `getDoc('/users/victimId/sessions/session1')` -> DENIED
3. **Ghost Message Injection**: Post a message to a session you don't own.
   - Action: `setDoc('/users/victimId/sessions/session1/messages/msg1', { ... })` -> DENIED
4. **Metadata Poisoning**: Update a session's `userId` after creation.
   - Action: `updateDoc('/users/me/sessions/s1', { userId: 'someoneElse' })` -> DENIED
5. **PII Leak**: Read `/users/anotherUser` without ownership.
   - Action: `getDoc('/users/victimId')` -> DENIED (if non-public)
6. **Large Document Attack**: Send a message with 2MB content.
   - Action: `setDoc(..., { content: 'A'.repeat(2000000) })` -> DENIED (size check)
7. **Invalid ID Injection**: Use a huge random string as doc ID.
   - Action: `setDoc('/users/me/sessions/' + 'A'.repeat(500), { ... })` -> DENIED (isValidId check)
8. **Role Escalation**: Attempt to set `role: 'admin'` in user profile (if it existed).
   - Action: `setDoc('/users/me', { isAdmin: true })` -> DENIED (field protection)
9. **Timestamp Manipulation**: Set `updatedAt` to the future.
   - Action: `setDoc(..., { updatedAt: Date.now() + 10000000 })` -> DENIED (request.time check)
10. **Shadow Field injection**: Add `isVerified: true` to a session.
    - Action: `setDoc(..., { title: 'Hi', isVerified: true })` -> DENIED (strict keys)
11. **Session Orphanage**: Create a message for a non-existent session.
    - Action: `setDoc('/users/me/sessions/NOT_EXISTS/messages/m1', { ... })` -> DENIED (existsAfter/exists check)
12. **Query Scraping**: Attempt to list all sessions in the system.
    - Action: `getDocs(collectionGroup('sessions'))` -> DENIED (missing query enforcer)

## Test Runner (TDD)
I will implement `firestore.rules.test.ts` after drafting rules.

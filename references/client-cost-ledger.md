# Official CLI client cost and lifecycle

Entry: a caller explicitly creates one client. The client owns only its official
Unity CLI NDJSON shell child, request correlation and decoding; Unity/Pipeline
retain command validation, jobs and side effects. Importing the module starts
no process. Each client has one child, at most 8 pending requests, at most 4 MiB
per encoded request, an 8 MiB response-frame ceiling and a 4 KiB stderr tail.
UTF-8 frames are accumulated as bytes before decoding. No Editor, asset scan, socket, extra server,
command discovery cache, background retry or mutation replay is introduced.

One linear JSON/frame pass per admitted response; at most 8 outstanding promise
records/timers. Encoding metadata parameters admits at most 64 scalar entries;
arguments remain argv elements, never shell text. The retained frame buffer is
at most 8 MiB, with at most 16 MiB copied during geometric growth to its ceiling.
Decoded JSON and at most 32 MiB queued request bytes have a conservative 512 MiB
Node-process budget. Incoming native chunks are drained without copying their
complete contents into a second retained queue.
Pending records
do not retain complete response frames after completion. A large native OS chunk
containing several complete frames is drained before the residual-frame check.

Close, spawn/pipe failure, process exit, malformed protocol and explicit request
deadline reject pending callers once and retire the exact owned CLI child. A
deadline reports uncertain command outcome and never retries/cancels a durable
Unity job. Canonical polling consumes the returned native command/argument map,
including its capability; it does not reinterpret a route as another schema.

Regression cases use one injected process per client, <=8 requests, <=3 output
chunks per small frame; the response-overflow case uses one 8 MiB + 1 byte frame.
Deadlines use an explicit 20 ms test clock budget, with no Editor or Unity calls.
Native acceptance uses the real official shell and existing read-only commands,
plus the actual publication Job receipts. No test bypass mode exists in the
production API. Budget: pass.

The file-argument entry adds only an absolute path to the same official command;
it performs no filesystem IO or file cleanup. The caller owns the <=4 MiB native
payload and keeps it on uncertain outcomes. Native facade validation/read limits
remain authoritative. One additional fake-process case verifies path boundaries,
mutually exclusive sources and the unchanged original job receipt. Native
acceptance uses a 99,327-byte read-only argument object that exceeds Windows argv
capacity, then removes its exact file after the formal response. Constant client
work, no new buffer/cache/transport; pass.

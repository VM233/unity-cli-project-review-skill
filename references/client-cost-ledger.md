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
arguments remain argv elements, never shell text. Maximum live buffer <=12 MiB
including the incoming chunk; decoded JSON and at most 32 MiB queued request
bytes have a conservative 512 MiB Node-process budget. The frame buffer grows
geometrically, with at most 2*8 MiB copying before reaching its fixed ceiling.
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

-- Files are read ONLY through the app gateway /api/files/:id, which re-checks permission per request.
-- No direct storage read/sign for signed-in users: avoids storage-proxy caching and signed links outliving revocation.
DROP POLICY IF EXISTS evidence_read ON storage.objects;
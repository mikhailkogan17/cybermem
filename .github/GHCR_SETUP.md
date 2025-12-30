# Post-Setup: Making GHCR Images Public

After the first CI run, you need to make the images public so they can be pulled without authentication.

## Steps:

1. Go to https://github.com/mikhailkogan?tab=packages
2. For each package (cybermem-openmemory, cybermem-dashboard, etc.):
   - Click on the package
   - Go to "Package settings" (bottom right)
   - Scroll to "Danger Zone"
   - Click "Change visibility"
   - Select "Public"
   - Confirm

## Packages to make public:
- [ ] cybermem-openmemory
- [ ] cybermem-dashboard
- [ ] cybermem-db_exporter
- [ ] cybermem-log_exporter

## Alternative: Use GitHub Token

If you want to keep images private, add this to your `.env.local`:
```bash
GHCR_TOKEN=ghp_your_token_here
```

And login before pulling:
```bash
echo $GHCR_TOKEN | docker login ghcr.io -u mikhailkogan --password-stdin
```

# Publishing morphic-android to Maven Central

The publish **pipeline is ready** (vanniktech plugin + `release-android.yml`), but
the real publication needs a one-time maintainer setup. Until that exists, the
library builds locally (`./gradlew :morphic:publishToMavenLocal`) and CI proves
the artifact is well-formed on every push (publish dry-run).

Coordinates: `com.theermite.morphic:morphic:0.1.0` · License: Apache-2.0.

## One-time setup (maintainer)

| # | Step | Where |
|---|------|-------|
| 1 | Create a **Central Portal** account | https://central.sonatype.com |
| 2 | Register & **verify the namespace** `com.theermite` (add the DNS TXT record they give you to the `theermite.com` domain) | Central Portal → Namespaces |
| 3 | Generate a **GPG key**: `gpg --gen-key`, then publish the public key: `gpg --keyserver keyserver.ubuntu.com --send-keys <KEY_ID>` | local machine |
| 4 | Export the private key (in-memory format): `gpg --armor --export-secret-keys <KEY_ID>` | local machine |
| 5 | Generate a Central Portal **user token** (username + password) | Central Portal → Account |
| 6 | Add the four **GitHub repository secrets** below | repo → Settings → Secrets → Actions |

### Required GitHub secrets

| Secret | Value |
|--------|-------|
| `MAVEN_CENTRAL_USERNAME` | Central Portal token username |
| `MAVEN_CENTRAL_PASSWORD` | Central Portal token password |
| `SIGNING_KEY` | the armored private key from step 4 (full block) |
| `SIGNING_KEY_PASSWORD` | the GPG key passphrase |

> Never paste these into code, commits, or chat. They live only in GitHub secrets.

## Releasing

Once the secrets exist, publishing is a tag:

```bash
git tag morphic-android-v0.1.0
git push origin morphic-android-v0.1.0
```

The `release-android` workflow runs `publishAndReleaseToMavenCentral` — it uploads
and releases in one step, no web-UI interaction. The artifact appears on Maven
Central within ~15–30 min.

## Local dry-run (anyone, no secrets)

```bash
cd android
./gradlew :morphic:publishToMavenLocal   # → ~/.m2/repository/com/theermite/morphic/
```

Inspect the generated `.pom` to confirm coordinates, license, and SCM are correct.

# 백엔드 실행 및 환경 변수

백엔드는 `backend/` 디렉터리에서 실행한다.

```powershell
cd backend
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
.\gradlew.bat test
```

다음 값은 소스나 Git에 저장하지 않고 실행 환경에서 제공한다.

| 변수 | 용도 |
| --- | --- |
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | 애플리케이션 DB 계정 |
| `JWT_SECRET` | Base64 인코딩된 256비트 이상 JWT 서명 키 |
| `IP_HMAC_SECRET` | 비회원 조회 IP HMAC 키 |
| `ADMIN_EMAIL` | Flyway 초기 ADMIN 이메일 |
| `ADMIN_PASSWORD_HASH` | 초기 ADMIN의 BCrypt 해시 |
| `COOKIE_SECURE` | HTTPS 환경에서는 `true` |

Flyway는 `backend/src/main/resources/db/migration`의 새 파일만 적용한다. 기존 마이그레이션 파일을 수정하지 않는다.

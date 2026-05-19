package com.diaryproject.backend.auth.oauth.repository;

import com.diaryproject.backend.auth.oauth.entity.OAuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {
    Optional<OAuthIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);
}

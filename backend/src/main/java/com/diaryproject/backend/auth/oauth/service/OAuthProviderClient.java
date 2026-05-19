package com.diaryproject.backend.auth.oauth.service;

import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;

public interface OAuthProviderClient {
    OAuthProvider getProvider();

    String buildAuthorizationUri(String state, String returnTo);

    OAuthDTO.ProviderProfile fetchUserProfile(String code);
}

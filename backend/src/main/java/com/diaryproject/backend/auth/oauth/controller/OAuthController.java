package com.diaryproject.backend.auth.oauth.controller;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.auth.oauth.service.OAuthService;
import com.diaryproject.backend.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/auth/oauth")
public class OAuthController {

    private final OAuthService oauthService;

    public OAuthController(OAuthService oauthService) {
        this.oauthService = oauthService;
    }

    @GetMapping("/{provider}/authorize")
    public ResponseEntity<Void> authorize(@PathVariable String provider,
                                          @RequestParam(defaultValue = "/schedule") String returnTo) {
        return ResponseEntity.status(302)
                .location(URI.create(oauthService.startAuthorization(provider, returnTo)))
                .build();
    }

    @GetMapping("/{provider}/callback")
    public ResponseEntity<Void> callback(@PathVariable String provider,
                                         @RequestParam String code,
                                         @RequestParam String state) {
        return ResponseEntity.status(302)
                .location(URI.create(oauthService.handleCallback(provider, code, state)))
                .build();
    }

    @PostMapping("/complete")
    public ApiResponse<AuthDTO.AuthResponse> complete(@Valid @RequestBody OAuthDTO.CompleteRequest request) {
        return ApiResponse.success(oauthService.completeLogin(request));
    }
}

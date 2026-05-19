package com.diaryproject.backend.auth.oauth.service;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.auth.oauth.entity.OAuthIdentity;
import com.diaryproject.backend.auth.oauth.repository.OAuthIdentityRepository;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.settings.entity.UserSettings;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuthService {

    private static final Duration STATE_TTL = Duration.ofMinutes(5);
    private static final Duration TICKET_TTL = Duration.ofMinutes(2);
    private static final String STATE_KEY_PREFIX = "oauth:state:";
    private static final String TICKET_KEY_PREFIX = "oauth:ticket:";

    private final OAuthIdentityRepository identityRepository;
    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CacheService cacheService;
    private final Map<OAuthProvider, OAuthProviderClient> clients;
    private final String frontendBaseUrl;

    public OAuthService(OAuthIdentityRepository identityRepository,
                        UserRepository userRepository,
                        UserSettingsRepository userSettingsRepository,
                        PasswordEncoder passwordEncoder,
                        JwtUtil jwtUtil,
                        CacheService cacheService,
                        List<OAuthProviderClient> providerClients,
                        @Value("${app.frontend-base-url:https://www.sevensense.art}") String frontendBaseUrl) {
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cacheService = cacheService;
        this.clients = new EnumMap<>(OAuthProvider.class);
        for (OAuthProviderClient client : providerClients) {
            this.clients.put(client.getProvider(), client);
        }
        this.frontendBaseUrl = stripTrailingSlash(frontendBaseUrl);
    }

    public String startAuthorization(String provider, String returnTo) {
        OAuthProvider oauthProvider = OAuthProvider.from(provider);
        OAuthProviderClient client = getClient(oauthProvider);
        String safeReturnTo = sanitizeReturnTo(returnTo);
        String state = UUID.randomUUID().toString();
        cacheService.put(stateKey(state), new OAuthDTO.OAuthState(oauthProvider.value(), safeReturnTo), STATE_TTL);
        return client.buildAuthorizationUri(state, safeReturnTo);
    }

    @Transactional
    public String handleCallback(String provider, String code, String state) {
        OAuthProvider oauthProvider = OAuthProvider.from(provider);
        OAuthDTO.OAuthState storedState = consumeState(state);
        if (!oauthProvider.value().equals(storedState.getProvider())) {
            throw new BadRequestException("OAuth state is invalid");
        }

        OAuthDTO.ProviderProfile profile = getClient(oauthProvider).fetchUserProfile(code);
        if (profile.getOpenid() == null || profile.getOpenid().isBlank()) {
            throw new BadRequestException("OAuth provider did not return an identity");
        }

        User user = findOrCreateUser(oauthProvider, profile);
        AuthDTO.AuthResponse authResponse = buildAuthResponse(user);
        String ticket = UUID.randomUUID().toString();
        cacheService.put(ticketKey(ticket), new OAuthDTO.OAuthTicket(authResponse, storedState.getReturnTo()), TICKET_TTL);

        return UriComponentsBuilder.fromUriString(frontendBaseUrl)
                .path("/oauth/callback")
                .queryParam("ticket", ticket)
                .queryParam("returnTo", storedState.getReturnTo())
                .build()
                .encode()
                .toUriString();
    }

    public AuthDTO.AuthResponse completeLogin(OAuthDTO.CompleteRequest request) {
        String ticket = request.getTicket();
        OAuthDTO.OAuthTicket payload = cacheService.get(ticketKey(ticket), OAuthDTO.OAuthTicket.class)
                .orElseThrow(() -> new BadRequestException("OAuth login ticket expired"));
        cacheService.evict(ticketKey(ticket));
        return payload.getAuthResponse();
    }

    private OAuthDTO.OAuthState consumeState(String state) {
        OAuthDTO.OAuthState payload = cacheService.get(stateKey(state), OAuthDTO.OAuthState.class)
                .orElseThrow(() -> new BadRequestException("OAuth state expired"));
        cacheService.evict(stateKey(state));
        return payload;
    }

    private User findOrCreateUser(OAuthProvider provider, OAuthDTO.ProviderProfile profile) {
        Optional<OAuthIdentity> existing = identityRepository.findByProviderAndProviderUserId(provider.value(), profile.getOpenid());
        if (existing.isPresent()) {
            OAuthIdentity identity = existing.get();
            if (identity.getUser() != null) {
                return identity.getUser();
            }
            return userRepository.findById(identity.getUserId())
                    .orElseThrow(() -> new BadRequestException("OAuth account is not linked to a valid user"));
        }

        User savedUser = createUser(provider, profile);
        createDefaultSettings(savedUser);
        createIdentity(provider, profile, savedUser);
        return savedUser;
    }

    private User createUser(OAuthProvider provider, OAuthDTO.ProviderProfile profile) {
        User user = new User();
        user.setUsername(provider.value() + "_" + hash(profile.getOpenid()).substring(0, 24));
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setNickname(profile.getNickname());
        user.setAvatar(profile.getAvatar());
        return userRepository.save(user);
    }

    private void createDefaultSettings(User user) {
        UserSettings settings = new UserSettings();
        settings.setUserId(user.getId());
        settings.setTheme("morandi");
        settings.setAutoSaveThoughts(false);
        userSettingsRepository.save(settings);
    }

    private void createIdentity(OAuthProvider provider, OAuthDTO.ProviderProfile profile, User user) {
        OAuthIdentity identity = new OAuthIdentity();
        identity.setUserId(user.getId());
        identity.setProvider(provider.value());
        identity.setProviderUserId(profile.getOpenid());
        identity.setUnionId(profile.getUnionid());
        identity.setNickname(profile.getNickname());
        identity.setAvatar(profile.getAvatar());
        identityRepository.save(identity);
    }

    private AuthDTO.AuthResponse buildAuthResponse(User user) {
        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse();
        response.setToken(jwtUtil.generateToken(user.getId(), user.getUsername()));
        response.setUser(mapToUserInfo(user));
        return response;
    }

    private AuthDTO.UserInfo mapToUserInfo(User user) {
        AuthDTO.UserInfo info = new AuthDTO.UserInfo();
        info.setId(user.getId());
        info.setUsername(user.getUsername());
        info.setNickname(user.getNickname());
        info.setAvatar(user.getAvatar());
        info.setSignature(user.getSignature());
        String theme = userSettingsRepository.findByUserId(user.getId())
                .map(UserSettings::getTheme)
                .orElse("morandi");
        info.setTheme(theme);
        return info;
    }

    private OAuthProviderClient getClient(OAuthProvider provider) {
        OAuthProviderClient client = clients.get(provider);
        if (client == null) {
            throw new BadRequestException("OAuth provider is not configured");
        }
        return client;
    }

    private String sanitizeReturnTo(String returnTo) {
        if (returnTo == null || returnTo.isBlank()) {
            return "/schedule";
        }
        if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
            return "/schedule";
        }
        return returnTo;
    }

    private static String stateKey(String state) {
        return STATE_KEY_PREFIX + state;
    }

    private static String ticketKey(String ticket) {
        return TICKET_KEY_PREFIX + ticket;
    }

    private static String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://www.sevensense.art";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}

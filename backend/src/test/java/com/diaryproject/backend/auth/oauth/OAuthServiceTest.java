package com.diaryproject.backend.auth.oauth;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.entity.User;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.auth.oauth.entity.OAuthIdentity;
import com.diaryproject.backend.auth.oauth.repository.OAuthIdentityRepository;
import com.diaryproject.backend.auth.oauth.service.OAuthProvider;
import com.diaryproject.backend.auth.oauth.service.OAuthProviderClient;
import com.diaryproject.backend.auth.oauth.service.OAuthService;
import com.diaryproject.backend.auth.repository.UserRepository;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.security.JwtUtil;
import com.diaryproject.backend.settings.entity.UserSettings;
import com.diaryproject.backend.settings.repository.UserSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OAuthServiceTest {

    @Test
    void handleCallback_returnsTicketForExistingIdentity() {
        Fixture fx = new Fixture();
        User user = user(7L, "github_existing", "Existing");
        OAuthIdentity identity = identity(12L, user);

        when(fx.cacheService.get(eq("oauth:state:state-1"), eq(OAuthDTO.OAuthState.class)))
                .thenReturn(Optional.of(new OAuthDTO.OAuthState("github", "/schedule")));
        when(fx.githubClient.fetchUserProfile("code-1"))
                .thenReturn(new OAuthDTO.ProviderProfile("github-id", null, "GitHub Name", "https://avatar"));
        when(fx.identityRepository.findByProviderAndProviderUserId("github", "github-id"))
                .thenReturn(Optional.of(identity));
        when(fx.jwtUtil.generateToken(7L, "github_existing")).thenReturn("jwt-7");
        when(fx.settingsRepository.findByUserId(7L)).thenReturn(Optional.empty());

        String redirect = fx.service.handleCallback("github", "code-1", "state-1");

        assertTrue(redirect.startsWith("https://www.sevensense.art/oauth/callback?ticket="));
        assertTrue(redirect.contains("returnTo=/schedule"));
        verify(fx.cacheService).evict("oauth:state:state-1");
        verify(fx.cacheService).put(startsWith("oauth:ticket:"), any(OAuthDTO.OAuthTicket.class), any());
        verify(fx.userRepository, never()).save(any());
    }

    @Test
    void handleCallback_createsUserSettingsAndIdentityForNewProviderUser() {
        Fixture fx = new Fixture();
        User saved = user(9L, "github_generated", "GitHub Name");

        when(fx.cacheService.get(eq("oauth:state:state-2"), eq(OAuthDTO.OAuthState.class)))
                .thenReturn(Optional.of(new OAuthDTO.OAuthState("github", "/analysis")));
        when(fx.githubClient.fetchUserProfile("code-2"))
                .thenReturn(new OAuthDTO.ProviderProfile("github-id-new", null, "GitHub Name", "https://avatar-new"));
        when(fx.identityRepository.findByProviderAndProviderUserId("github", "github-id-new"))
                .thenReturn(Optional.empty());
        when(fx.passwordEncoder.encode(anyString())).thenReturn("encoded-placeholder");
        when(fx.userRepository.save(any(User.class))).thenReturn(saved);
        when(fx.jwtUtil.generateToken(9L, "github_generated")).thenReturn("jwt-9");
        when(fx.settingsRepository.findByUserId(9L)).thenReturn(Optional.empty());

        fx.service.handleCallback("github", "code-2", "state-2");

        verify(fx.userRepository).save(argThat(user ->
                user.getUsername().startsWith("github_")
                        && "encoded-placeholder".equals(user.getPassword())
                        && "GitHub Name".equals(user.getNickname())
                        && "https://avatar-new".equals(user.getAvatar())
        ));
        verify(fx.settingsRepository).save(argThat(settings ->
                settings.getUserId().equals(9L)
                        && "morandi".equals(settings.getTheme())
                        && Boolean.FALSE.equals(settings.getAutoSaveThoughts())
        ));
        verify(fx.identityRepository).save(argThat(oauth ->
                oauth.getUserId().equals(9L)
                        && "github".equals(oauth.getProvider())
                        && "github-id-new".equals(oauth.getProviderUserId())
                        && oauth.getUnionId() == null
        ));
    }

    @Test
    void handleCallback_throwsBadRequestExceptionWhenStateMissing() {
        Fixture fx = new Fixture();
        when(fx.cacheService.get(eq("oauth:state:missing"), eq(OAuthDTO.OAuthState.class)))
                .thenReturn(Optional.empty());

        assertThrows(BadRequestException.class,
                () -> fx.service.handleCallback("github", "code", "missing"));

        verify(fx.githubClient, never()).fetchUserProfile(anyString());
    }

    @Test
    void startAuthorization_rejectsQqProvider() {
        Fixture fx = new Fixture();

        assertThrows(BadRequestException.class,
                () -> fx.service.startAuthorization("qq", "/schedule"));
    }

    @Test
    void completeLogin_throwsBadRequestExceptionWhenTicketMissing() {
        Fixture fx = new Fixture();
        when(fx.cacheService.get(eq("oauth:ticket:missing"), eq(OAuthDTO.OAuthTicket.class)))
                .thenReturn(Optional.empty());

        OAuthDTO.CompleteRequest request = new OAuthDTO.CompleteRequest();
        request.setTicket("missing");

        assertThrows(BadRequestException.class, () -> fx.service.completeLogin(request));
    }

    private static User user(Long id, String username, String nickname) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setNickname(nickname);
        return user;
    }

    private static OAuthIdentity identity(Long id, User user) {
        OAuthIdentity identity = new OAuthIdentity();
        identity.setId(id);
        identity.setUserId(user.getId());
        identity.setUser(user);
        identity.setProvider("github");
        identity.setProviderUserId("github-id");
        return identity;
    }

    private static final class Fixture {
        private final OAuthIdentityRepository identityRepository = mock(OAuthIdentityRepository.class);
        private final UserRepository userRepository = mock(UserRepository.class);
        private final UserSettingsRepository settingsRepository = mock(UserSettingsRepository.class);
        private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        private final JwtUtil jwtUtil = mock(JwtUtil.class);
        private final CacheService cacheService = mock(CacheService.class);
        private final OAuthProviderClient githubClient = mock(OAuthProviderClient.class);
        private final OAuthService service;

        private Fixture() {
            when(githubClient.getProvider()).thenReturn(OAuthProvider.GITHUB);
            when(githubClient.buildAuthorizationUri(anyString(), anyString())).thenReturn("https://github.example/auth");
            service = new OAuthService(
                    identityRepository,
                    userRepository,
                    settingsRepository,
                    passwordEncoder,
                    jwtUtil,
                    cacheService,
                    List.of(githubClient),
                    "https://www.sevensense.art"
            );
        }
    }
}

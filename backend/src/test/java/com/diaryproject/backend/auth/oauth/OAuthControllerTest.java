package com.diaryproject.backend.auth.oauth;

import com.diaryproject.backend.auth.dto.AuthDTO;
import com.diaryproject.backend.auth.oauth.controller.OAuthController;
import com.diaryproject.backend.auth.oauth.dto.OAuthDTO;
import com.diaryproject.backend.auth.oauth.service.OAuthService;
import com.diaryproject.backend.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OAuthControllerTest {

    @Test
    void authorize_redirectsToProviderAuthorizationUri() {
        OAuthService service = mock(OAuthService.class);
        when(service.startAuthorization("github", "/schedule")).thenReturn("https://github.com/login/oauth/authorize");

        OAuthController controller = new OAuthController(service);
        ResponseEntity<Void> response = controller.authorize("github", "/schedule");

        assertEquals(302, response.getStatusCode().value());
        assertEquals(URI.create("https://github.com/login/oauth/authorize"), response.getHeaders().getLocation());
    }

    @Test
    void callback_redirectsToFrontendCallbackUri() {
        OAuthService service = mock(OAuthService.class);
        when(service.handleCallback("github", "code", "state")).thenReturn("https://www.sevensense.art/oauth/callback?ticket=t");

        OAuthController controller = new OAuthController(service);
        ResponseEntity<Void> response = controller.callback("github", "code", "state");

        assertEquals(302, response.getStatusCode().value());
        assertEquals(URI.create("https://www.sevensense.art/oauth/callback?ticket=t"), response.getHeaders().getLocation());
    }

    @Test
    void complete_returnsAuthResponse() {
        OAuthService service = mock(OAuthService.class);
        OAuthDTO.CompleteRequest request = new OAuthDTO.CompleteRequest();
        request.setTicket("ticket");
        AuthDTO.AuthResponse authResponse = new AuthDTO.AuthResponse();
        authResponse.setToken("jwt");
        when(service.completeLogin(request)).thenReturn(authResponse);

        OAuthController controller = new OAuthController(service);
        ApiResponse<AuthDTO.AuthResponse> response = controller.complete(request);

        assertEquals(200, response.getCode());
        assertEquals("jwt", response.getData().getToken());
    }
}

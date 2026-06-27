// Controller pentru login, register si doctorul autentificat
package ro.licenta.kinetolive.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.licenta.kinetolive.dto.auth.AuthResponse;
import ro.licenta.kinetolive.dto.auth.DoctorResponse;
import ro.licenta.kinetolive.dto.auth.LoginRequest;
import ro.licenta.kinetolive.dto.auth.RegisterRequest;
import ro.licenta.kinetolive.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public DoctorResponse me(Authentication authentication) {
        return authService.getCurrentDoctor(authentication.getName());
    }
}

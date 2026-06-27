// Configurare pentru documentatia OpenAPI a aplicatiei KinetoLive
package ro.licenta.kinetolive.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI kinetoLiveOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("KinetoLive API")
                        .version("1.0.0")
                        .description("API pentru platforma KinetoLive: exercitii, pacienti, sesiuni de recuperare si rezultate."));
    }
}
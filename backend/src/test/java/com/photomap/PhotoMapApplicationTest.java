package com.photomap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photomap-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.sql.init.mode=never"
})
class PhotoMapApplicationTest {

    @Test
    void applicationContextLoadsWithH2Schema() {
    }
}

package com.portfolio.pos;

import com.portfolio.pos.account.*;
import com.portfolio.pos.order.OrderRepository;
import com.portfolio.pos.product.ProductRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class PosApiIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired AccountService accounts;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired OrderRepository orders;
    MockHttpSession admin,cashier,other;
    @BeforeEach void setup() throws Exception {
        orders.deleteAll();products.deleteAll();users.deleteAll();
        accounts.create(new AccountService.CreateUser("Admin","admin@example.com","ValidPassword123!","Admin"));
        accounts.create(new AccountService.CreateUser("Cashier","cashier@example.com","ValidPassword123!","Cashier"));
        accounts.create(new AccountService.CreateUser("Other","other@example.com","ValidPassword123!","Cashier"));
        admin=login("admin@example.com");cashier=login("cashier@example.com");other=login("other@example.com");
        var config=mvc.perform(get("/api/settings").session(admin)).andReturn().getResponse().getContentAsString();
        Number version=JsonPath.read(config,"$.version");
        mvc.perform(put("/api/settings").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
            {"name":"Test store","taxMode":"fixed","taxValue":5000,"tables":10,"version":%d}
            """.formatted(version.longValue()))).andExpect(status().isOk());
    }
    MockHttpSession login(String email) throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/auth/login").with(csrf()).param("email",email).param("password","ValidPassword123!"))
            .andExpect(status().isNoContent()).andReturn().getRequest().getSession(false);
    }
    long product(String name,int price) throws Exception {
        String json=mvc.perform(post("/api/products").session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\""+name+"\",\"price\":"+price+",\"category\":\"Beverages\",\"unit\":\"cup\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number)JsonPath.read(json,"$.id")).longValue();
    }
    String body(long id,String key,String state,int quantity,int cash,String version){return """
        {"requestId":"%s","customer":"Anisa","service":"Take Away","status":"%s","cash":%d,"version":%s,
         "subtotal":1,"total":1,"items":[{"productId":%d,"quantity":%d,"note":"No ice","price":1}]}
        """.formatted(key,state,cash,version,id,quantity);}
    MvcResult create(MockHttpSession session,String body) throws Exception {return mvc.perform(post("/api/orders").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn();}

    @Test void sessionLoginCsrfAndLogoutAreEnforced() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").param("email","admin@example.com").param("password","ValidPassword123!")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","admin@example.com").param("password","wrong")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());
        mvc.perform(get("/api/auth/me").session(admin)).andExpect(jsonPath("$.role").value("Admin")).andExpect(jsonPath("$.password").doesNotExist());
        mvc.perform(post("/api/auth/logout").session(admin).with(csrf())).andExpect(status().isNoContent());
        assertThat(admin.isInvalid()).isTrue();
    }
    @Test void actualBrowserCsrfTokenWorksAcrossLoginAndRotation() throws Exception {
        var initial=mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        String json=initial.getResponse().getContentAsString();String token=JsonPath.read(json,"$.token");String header=JsonPath.read(json,"$.headerName");
        var browser=(MockHttpSession)initial.getRequest().getSession(false);
        mvc.perform(post("/api/auth/login").session(browser).header(header,token).param("email","admin@example.com").param("password","ValidPassword123!"))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/products").session(browser).header(header,token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Tea\",\"price\":1000}"))
            .andExpect(status().isForbidden());
        String next=mvc.perform(get("/api/auth/csrf").session(browser)).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/products").session(browser).header(header,(String)JsonPath.read(next,"$.token")).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Tea\",\"price\":1000}"))
            .andExpect(status().isCreated());
    }
    @Test void changedCheckoutTotalRequiresReviewBeforePayment() throws Exception {
        long id=product("Tea",20000);
        String payload=body(id,UUID.randomUUID().toString(),"Paid",1,50000,"null").replace("\"subtotal\":1", "\"expectedTotal\":1,\"subtotal\":1");
        mvc.perform(post("/api/orders").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isConflict());
        assertThat(orders.count()).isZero();
    }
    @Test void cashierCannotManageCatalogSettingsOrUsers() throws Exception {
        mvc.perform(post("/api/products").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Tea\",\"price\":1}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/settings").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/users").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
    }
    @Test void serverComputesPricesAndPaymentCannotBeForged() throws Exception {
        long id=product("Tea",20000);
        var result=create(cashier,body(id,UUID.randomUUID().toString(),"Paid",2,50000,"null"));
        var json=result.getResponse().getContentAsString();
        assertThat(new BigDecimal(JsonPath.read(json,"$.total").toString())).isEqualByComparingTo("45000");
        assertThat(new BigDecimal(JsonPath.read(json,"$.change").toString())).isEqualByComparingTo("5000");
        mvc.perform(post("/api/orders").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(id,UUID.randomUUID().toString(),"Paid",2,1,"null")))
            .andExpect(status().isBadRequest());
        assertThat(orders.count()).isEqualTo(1);
    }
    @Test void snapshotsSurviveCatalogEditsAndDeletion() throws Exception {
        long id=product("Tea",20000);var created=create(cashier,body(id,UUID.randomUUID().toString(),"Paid",1,30000,"null"));
        long orderId=((Number)JsonPath.read(created.getResponse().getContentAsString(),"$.id")).longValue();
        mvc.perform(put("/api/products/"+id).session(admin).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"New name\",\"price\":1}")).andExpect(status().isOk());
        mvc.perform(delete("/api/products/"+id).session(admin).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/orders/"+orderId).session(cashier)).andExpect(jsonPath("$.items[0].name").value("Tea")).andExpect(jsonPath("$.items[0].price").value(20000));
    }
    @Test void archivedOrderPaymentIsVersionedAndPaidOrdersAreImmutable() throws Exception {
        long id=product("Tea",20000);var json=create(cashier,body(id,UUID.randomUUID().toString(),"Archived",1,0,"null")).getResponse().getContentAsString();
        long orderId=((Number)JsonPath.read(json,"$.id")).longValue();long version=((Number)JsonPath.read(json,"$.version")).longValue();
        mvc.perform(put("/api/orders/"+orderId).session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(id,UUID.randomUUID().toString(),"Paid",1,30000,String.valueOf(version+1)))).andExpect(status().isConflict());
        String key=UUID.randomUUID().toString();String payment=body(id,key,"Paid",1,30000,String.valueOf(version));
        mvc.perform(put("/api/orders/"+orderId).session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payment)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("Paid"));
        mvc.perform(put("/api/orders/"+orderId).session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payment)).andExpect(status().isOk());
        mvc.perform(put("/api/orders/"+orderId).session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(id,UUID.randomUUID().toString(),"Paid",1,30000,"1"))).andExpect(status().isConflict());
    }
    @Test void duplicateCreatesAreIdempotentEvenWhenConcurrent() throws Exception {
        long id=product("Tea",20000);String payload=body(id,UUID.randomUUID().toString(),"Paid",1,30000,"null");
        var pool=Executors.newFixedThreadPool(2);
        try {
            var one=pool.submit(()->create(cashier,payload).getResponse().getContentAsString());
            var two=pool.submit(()->create(cashier,payload).getResponse().getContentAsString());
            assertThat((Number)JsonPath.read(one.get(15,TimeUnit.SECONDS),"$.id")).isEqualTo((Number)JsonPath.read(two.get(15,TimeUnit.SECONDS),"$.id"));
            assertThat(orders.count()).isEqualTo(1);
        }finally{pool.shutdownNow();}
    }
    @Test void cashierCannotReadOrModifyAnotherCashiersOrder() throws Exception {
        long id=product("Tea",20000);var result=create(cashier,body(id,UUID.randomUUID().toString(),"Archived",1,0,"null"));
        long orderId=((Number)JsonPath.read(result.getResponse().getContentAsString(),"$.id")).longValue();
        mvc.perform(get("/api/orders/"+orderId).session(other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders").session(other)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(put("/api/orders/"+orderId).session(other).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(id,UUID.randomUUID().toString(),"Paid",1,30000,"0"))).andExpect(status().isNotFound());
    }
    @Test void reportsExcludeUnpaidOrdersAndUseRequestedDateRange() throws Exception {
        long id=product("Tea",20000);create(cashier,body(id,UUID.randomUUID().toString(),"Paid",2,50000,"null"));create(cashier,body(id,UUID.randomUUID().toString(),"Archived",3,0,"null"));
        String day=LocalDate.now(java.time.ZoneId.of("Asia/Jakarta")).toString();
        mvc.perform(get("/api/reports").session(admin).param("from",day).param("to",day))
            .andExpect(jsonPath("$.summary.revenue").value(40000)).andExpect(jsonPath("$.summary.orders").value(1))
            .andExpect(jsonPath("$.summary.archived").value(1)).andExpect(jsonPath("$.daily[0].revenue").value(40000))
            .andExpect(jsonPath("$.products[0].quantity").value(2));
        mvc.perform(get("/api/reports").session(admin).param("from","2026-10-20").param("to","2026-10-01")).andExpect(status().isBadRequest());
    }
    @Test void cleanPageUrlsServeHtmlAndLegacyUrlsRedirectWithQuery() throws Exception {
        for(String route:new String[]{"cashier","admin","catalog","reports","settings","profile","login"}){
            mvc.perform(get("/"+route)).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<!doctype html>")));
            String legacy=route.equals("cashier")?"index":route;
            mvc.perform(get("/"+legacy+".html?next=reports.html"))
                .andExpect(status().isFound()).andExpect(header().string("Location","/"+route+"?next=reports.html"));
        }
        mvc.perform(get("/")).andExpect(status().isFound()).andExpect(header().string("Location","/cashier"));
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/styles.css")).andExpect(status().isOk());
    }
    @Test void cashierReportsOnlyIncludeTheirOwnTransactionsAndAggregates() throws Exception {
        long tea=product("Tea",20000),coffee=product("Coffee",30000);
        create(cashier,body(tea,UUID.randomUUID().toString(),"Paid",2,50000,"null"));
        create(cashier,body(tea,UUID.randomUUID().toString(),"Archived",1,0,"null"));
        create(other,body(coffee,UUID.randomUUID().toString(),"Paid",3,100000,"null"));
        String day=LocalDate.now(java.time.ZoneId.of("Asia/Jakarta")).toString();
        mvc.perform(get("/api/reports").session(cashier).param("from",day).param("to",day)).andExpect(status().isOk())
            .andExpect(jsonPath("$.orders.length()").value(2)).andExpect(jsonPath("$.summary.revenue").value(40000))
            .andExpect(jsonPath("$.summary.orders").value(1)).andExpect(jsonPath("$.summary.archived").value(1))
            .andExpect(jsonPath("$.summary.tax").value(5000)).andExpect(jsonPath("$.daily[0].revenue").value(40000))
            .andExpect(jsonPath("$.products.length()").value(1)).andExpect(jsonPath("$.products[0].name").value("Tea"))
            .andExpect(jsonPath("$.products[0].quantity").value(2));
        mvc.perform(get("/api/reports").session(other).param("from",day).param("to",day))
            .andExpect(jsonPath("$.orders.length()").value(1)).andExpect(jsonPath("$.summary.revenue").value(90000))
            .andExpect(jsonPath("$.products[0].name").value("Coffee"));
        mvc.perform(get("/api/reports").session(admin).param("from",day).param("to",day))
            .andExpect(jsonPath("$.orders.length()").value(3)).andExpect(jsonPath("$.summary.revenue").value(130000));
        mvc.perform(get("/api/reports").param("from",day).param("to",day)).andExpect(status().isUnauthorized());
    }
    @Test void profileEmailChangesKeepSessionValidAndEnforceUniqueness() throws Exception {
        mvc.perform(put("/api/profile").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated\",\"email\":\"updated@example.com\",\"phone\":\"123\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated"));
        mvc.perform(get("/api/auth/me").session(cashier)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("updated@example.com"));
        mvc.perform(put("/api/profile").session(cashier).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated\",\"email\":\"admin@example.com\"}"))
            .andExpect(status().isConflict());
        assertThat(users.findByEmail("updated@example.com").orElseThrow().passwordHash).startsWith("$2").isNotEqualTo("ValidPassword123!");
    }
}

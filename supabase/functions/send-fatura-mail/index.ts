import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            status: 200,
            headers: corsHeaders,
        });
    }

    try {
        const body = await req.json();

        console.log("MAIL REQUEST:", body);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Fonksiyon çalýþtý",
                data: body,
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                message: String(error),
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    }
});